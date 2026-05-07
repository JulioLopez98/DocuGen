import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDocumentPrompt, DEFAULT_MODEL, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { generatePayloadSchema, getDocumentConfig, requiresPro } from "@/lib/document-types";
import { checkGenerationRateLimit, recordGenerationEvent } from "@/lib/rate-limit";
import { requireUser, type Profile } from "@/lib/supabase-server";

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
      input: buildDocumentPrompt(config, payload.formData),
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
        doc_type: config.type,
        doc_label: config.label,
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
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("profile_update_error", updateError);
    }

    await recordGenerationEvent(supabase, user.id);

    return NextResponse.json({
      id: document.id,
      docType: config.type,
      docLabel: config.label,
      content,
      formData: payload.formData,
      modelUsed: model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos del formulario.");
    }

    console.error("generate_error", error);
    return errorResponse(500, "generation_failed", "No se pudo generar el documento.");
  }
}
