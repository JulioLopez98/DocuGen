import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildTemplateDirectPrompt,
  documentInstructions,
  getOpenAIClient,
  PREMIUM_MODEL,
  type TemplateReference,
} from "@/lib/openai";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { checkActionRateLimit, checkGenerationRateLimit, recordActionRateLimitEvent, recordGenerationEvent } from "@/lib/rate-limit";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type DocumentTemplateRow, type Profile } from "@/lib/supabase-server";
import { defaultTemplateUsageMode } from "@/lib/template-usage";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { canUseWorkspace } from "@/lib/workspace-access";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const generateFromTemplateSchema = z.object({
  values: z.record(z.string(), z.string().trim().max(4000)).default({}),
  extraInstructions: z.string().trim().max(2000).optional().nullable(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para generar desde plantillas.");
    }

    const { id } = paramsSchema.parse(params);
    const payload = generateFromTemplateSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("template_direct_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "Generar desde una plantilla concreta esta disponible solo en DocuGen Pro.");
    }

    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", id)
      .single<DocumentTemplateRow>();

    if (templateError || !template) {
      console.error("template_direct_not_found", templateError);
      return errorResponse(404, "template_not_found", "No se encontro la plantilla.");
    }

    if (template.status !== "ready" || !template.extracted_text) {
      return errorResponse(400, "template_not_ready", "Procesa la plantilla antes de generar desde ella.");
    }

    const workspaceAccess = await canUseWorkspace(supabase, user.id, profile, template.workspace_id, "create_documents");

    if (!workspaceAccess.allowed) {
      return errorResponse(
        workspaceAccess.reason === "permission_denied" ? 403 : 404,
        workspaceAccess.reason || "workspace_denied",
        workspaceAccess.reason === "permission_denied"
          ? "No tienes permiso para generar documentos en este workspace."
          : "No tienes acceso a esta plantilla.",
      );
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de generaciones por hora.");
    }

    const actionRateLimit = await checkActionRateLimit({
      supabase,
      userId: user.id,
      workspaceId: template.workspace_id,
      action: "document_generate",
      userLimit: 80,
      workspaceLimit: profile.plan === "empresa" ? 240 : undefined,
    });

    if (!actionRateLimit.allowed) {
      return errorResponse(
        429,
        "rate_limit_reached",
        actionRateLimit.scope === "workspace"
          ? "El workspace ha alcanzado el limite de generaciones por hora."
          : "Has alcanzado el limite de generaciones por hora.",
      );
    }

    const openai = getOpenAIClient();

    if (!openai) {
      await recordApiErrorEvent({
        supabase,
        userId: user.id,
        route: "/api/templates/[id]/generate",
        provider: "openai",
        errorCode: "openai_not_configured",
        severity: "high",
        message: "OPENAI_API_KEY no esta configurada.",
        metadata: { templateId: template.id },
      });
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para generar documentos.");
    }

    const templateReference: TemplateReference = {
      id: template.id,
      name: template.name,
      category: template.category,
      summary: template.summary,
      metadata: template.extracted_metadata,
      extractedText: template.extracted_text,
      usageMode: defaultTemplateUsageMode,
    };
    const response = await openai.responses.create({
      model: PREMIUM_MODEL,
      instructions: documentInstructions,
      input: buildTemplateDirectPrompt({
        template: templateReference,
        values: payload.values,
        extraInstructions: payload.extraInstructions,
      }),
      temperature: 0.25,
      max_output_tokens: 4500,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvio contenido. Intentalo de nuevo.");
    }

    const docLabel = `Desde plantilla: ${template.name}`;
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        workspace_id: template.workspace_id,
        doc_type: `template:${template.id}`,
        doc_label: docLabel,
        content,
        form_data: {
          ...payload.values,
          __template_direct: JSON.stringify({
            id: template.id,
            name: template.name,
            extraInstructions: payload.extraInstructions || null,
          }),
        },
        reference_template_id: template.id,
        reference_template_name: template.name,
        template_usage_mode: defaultTemplateUsageMode,
        model_used: PREMIUM_MODEL,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("template_direct_document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("template_direct_profile_update_error", updateError);
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: template.workspace_id,
      actorId: user.id,
      eventType: "document_created",
      targetType: "document",
      targetId: document.id,
      summary: `Creo un documento desde ${template.name}`,
      metadata: {
        templateId: template.id,
        templateName: template.name,
      },
    });

    await recordGenerationEvent(supabase, user.id);
    await recordActionRateLimitEvent(supabase, {
      userId: user.id,
      workspaceId: template.workspace_id,
      action: "document_generate",
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: docLabel,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("template_direct_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: `template:${template.id}`,
      docLabel,
      content,
      formData: payload.values,
      modelUsed: PREMIUM_MODEL,
      templateTrace: {
        id: template.id,
        name: template.name,
        usageMode: defaultTemplateUsageMode,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos del formulario.");
    }

    console.error("template_direct_generate_error", error);
    await recordApiErrorEvent({
      route: "/api/templates/[id]/generate",
      provider: "openai",
      errorCode: "generation_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "generation_failed", "No se pudo generar el documento desde la plantilla.");
  }
}
