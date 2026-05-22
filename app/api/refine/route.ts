import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildRefinementPrompt,
  DEFAULT_MODEL,
  documentInstructions,
  getOpenAIClient,
  PREMIUM_MODEL,
} from "@/lib/openai";
import { documentTypeValues, getDocumentConfig, requiresPro } from "@/lib/document-types";
import { checkActionRateLimit, checkGenerationRateLimit, recordActionRateLimitEvent, recordGenerationEvent } from "@/lib/rate-limit";
import { refinementLabels, type RefinementMode } from "@/lib/refinement";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type Profile } from "@/lib/supabase-server";

const refinePayloadSchema = z.object({
  docType: z.enum(documentTypeValues),
  formData: z.record(z.string(), z.string().trim().max(4000)),
  content: z.string().trim().min(1).max(60000),
  mode: z.enum(["formal", "brief", "commercial", "natural"]),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para mejorar documentos.");
    }

    const json = await request.json();
    const payload = refinePayloadSchema.parse(json);
    const config = getDocumentConfig(payload.docType);

    if (!config) {
      return errorResponse(400, "invalid_doc_type", "Tipo de documento no valido.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free" && profile.docs_this_month >= 3) {
      return errorResponse(403, "limit_reached", "Has alcanzado el limite de 3 documentos gratuitos este mes.");
    }

    if (profile.plan === "free" && requiresPro(config)) {
      return errorResponse(403, "pro_required", "Este tipo de documento esta disponible solo en DocuGen Pro.");
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de generaciones por hora.");
    }

    const actionRateLimit = await checkActionRateLimit({
      supabase,
      userId: user.id,
      action: "document_improve",
      userLimit: profile.plan === "free" ? 10 : 60,
    });

    if (!actionRateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de mejoras con IA por hora.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para mejorar documentos.");
    }

    const model = profile.plan === "free" ? DEFAULT_MODEL : PREMIUM_MODEL;
    const mode = payload.mode as RefinementMode;
    const response = await openai.responses.create({
      model,
      instructions: documentInstructions,
      input: buildRefinementPrompt({
        config,
        formData: payload.formData,
        content: payload.content,
        mode,
      }),
      temperature: mode === "commercial" || mode === "natural" ? 0.35 : 0.25,
      max_output_tokens: 4000,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvio contenido. Intentalo de nuevo.");
    }

    const docLabel = `${config.label} - ${refinementLabels[mode]}`;
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        doc_type: config.type,
        doc_label: docLabel,
        content,
        form_data: payload.formData,
        model_used: model,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar la variante.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("profile_update_error", updateError);
    }

    await recordGenerationEvent(supabase, user.id);
    await recordActionRateLimitEvent(supabase, {
      userId: user.id,
      action: "document_improve",
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: docLabel,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("document_ready_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: config.type,
      docLabel,
      content,
      formData: payload.formData,
      modelUsed: model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos de la variante.");
    }

    console.error("refine_error", error);
    return errorResponse(500, "refinement_failed", "No se pudo mejorar el documento.");
  }
}
