import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDocumentPrompt, DEFAULT_MODEL, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { generatePayloadSchema, getDocumentConfig, requiresPro } from "@/lib/document-types";
import { checkGenerationRateLimit, recordGenerationEvent } from "@/lib/rate-limit";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type DocumentTemplateRow, type Profile } from "@/lib/supabase-server";
import type { TemplateUsageMode } from "@/lib/template-usage";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { canUseWorkspace } from "@/lib/workspace-access";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para generar documentos.");
    }

    const json = await request.json();
    const payload = generatePayloadSchema.parse(json);
    const config = getDocumentConfig(payload.docType);

    if (!config) {
      return errorResponse(400, "invalid_doc_type", "Tipo de documento no válido.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    if (profile.plan === "free" && profile.docs_this_month >= 3) {
      return errorResponse(403, "limit_reached", "Has alcanzado el límite de 3 documentos gratuitos este mes.");
    }

    if (profile.plan === "free" && requiresPro(config)) {
      return errorResponse(403, "pro_required", "Este tipo de documento esta disponible solo en DocuGen Pro.");
    }

    const workspaceAccess = await canUseWorkspace(supabase, user.id, profile, payload.workspaceId, "create_documents");

    if (!workspaceAccess.allowed) {
      const reason = workspaceAccess.reason || "not_member";
      return errorResponse(
        reason === "empresa_required" ? 403 : 404,
        reason,
        reason === "empresa_required"
          ? "Guardar documentos en workspace esta disponible en el plan Empresa."
          : reason === "permission_denied"
            ? "No tienes permiso para generar documentos en este workspace."
            : "No tienes acceso a ese workspace.",
      );
    }

    const templateReference = payload.referenceTemplateId
      ? await getTemplateReference(supabase, user.id, profile, payload.referenceTemplateId, payload.templateUsageMode)
      : null;

    if (templateReference instanceof NextResponse) {
      return templateReference;
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el límite de generaciones por hora.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para generar documentos.");
    }

    const model = profile.plan === "free" ? DEFAULT_MODEL : PREMIUM_MODEL;
    const response = await openai.responses.create({
      model,
      instructions: documentInstructions,
      input: buildDocumentPrompt(config, payload.formData, templateReference),
      temperature: 0.3,
      max_output_tokens: 4000,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvió contenido. Inténtalo de nuevo.");
    }

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        workspace_id: workspaceAccess.workspaceId,
        doc_type: config.type,
        doc_label: config.label,
        content,
        form_data: {
          ...payload.formData,
          ...(templateReference
            ? {
                __template_reference: JSON.stringify({
                  id: templateReference.id,
                  name: templateReference.name,
                  usageMode: templateReference.usageMode,
                }),
              }
            : {}),
        },
        reference_template_id: templateReference?.id || null,
        reference_template_name: templateReference?.name || null,
        template_usage_mode: templateReference?.usageMode || null,
        model_used: model,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("profile_update_error", updateError);
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: workspaceAccess.workspaceId,
      actorId: user.id,
      eventType: "document_created",
      targetType: "document",
      targetId: document.id,
      summary: `Creo ${config.label}`,
      metadata: {
        docType: config.type,
        docLabel: config.label,
        referenceTemplateId: templateReference?.id || null,
      },
    });

    await recordGenerationEvent(supabase, user.id);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: config.label,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("document_ready_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: config.type,
      docLabel: config.label,
      content,
      formData: payload.formData,
      modelUsed: model,
      templateTrace: templateReference
        ? {
            id: templateReference.id,
            name: templateReference.name,
            usageMode: templateReference.usageMode,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos del formulario.");
    }

    console.error("generate_error", error);
    return errorResponse(500, "generation_failed", "No se pudo generar el documento.");
  }
}

async function getTemplateReference(
  supabase: NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>,
  userId: string,
  profile: Profile,
  templateId: string,
  usageMode: TemplateUsageMode,
) {
  if (profile.plan === "free") {
    return errorResponse(403, "pro_required", "Las plantillas de referencia estan disponibles solo en DocuGen Pro.");
  }

  const { data: template, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", templateId)
    .single<DocumentTemplateRow>();

  if (error || !template || (template.user_id !== userId && !template.workspace_id)) {
    console.error("reference_template_not_found", error);
    return errorResponse(404, "template_not_found", "No se encontro la plantilla de referencia.");
  }

  if (template.status !== "ready" || !template.extracted_text) {
    return errorResponse(400, "template_not_ready", "Procesa la plantilla antes de usarla como referencia.");
  }

  return {
    id: template.id,
    name: template.name,
    category: template.category,
    summary: template.summary,
    metadata: template.extracted_metadata,
    extractedText: template.extracted_text,
    usageMode,
  };
}
