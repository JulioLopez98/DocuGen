import { NextResponse } from "next/server";
import { z } from "zod";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { buildCustomDocumentPrompt, DEFAULT_MODEL, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { checkActionRateLimit, checkGenerationRateLimit, recordActionRateLimitEvent, recordGenerationEvent } from "@/lib/rate-limit";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type Profile } from "@/lib/supabase-server";

const customGenerateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(20).max(5000),
  intendedUse: z.string().trim().max(1000).optional().nullable(),
  tone: z.enum(["formal", "comercial", "laboral_prudente", "legal_prudente", "email", "carta", "natural"]),
  sector: z.string().trim().max(160).optional().nullable(),
  requiredData: z.string().trim().max(3000).optional().nullable(),
});

const toneLabels: Record<z.infer<typeof customGenerateSchema>["tone"], string> = {
  formal: "Formal",
  comercial: "Comercial",
  laboral_prudente: "Laboral prudente",
  legal_prudente: "Legal prudente",
  email: "Email",
  carta: "Carta",
  natural: "Natural",
};

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para generar documentos.");
    }

    const payload = customGenerateSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("custom_generate_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    if (profile.plan === "free") {
      if (profile.docs_this_month >= 3) {
        return errorResponse(403, "limit_reached", "Has alcanzado el limite de 3 documentos gratuitos este mes.");
      }

      const { count: customDocsThisMonth, error: customCountError } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("doc_type", "custom")
        .gte("created_at", monthStart.toISOString());

      if (customCountError) {
        console.error("custom_free_count_error", customCountError);
        return errorResponse(500, "custom_count_failed", "No se pudo comprobar tu prueba gratuita a medida.");
      }

      if ((customDocsThisMonth || 0) >= 1) {
        return errorResponse(403, "custom_free_limit_reached", "El plan Free incluye 1 documento a medida de prueba al mes. Actualiza a Pro para generar documentos a medida ilimitados.");
      }
    }
    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el límite de generaciones por hora.");
    }

    const actionRateLimit = await checkActionRateLimit({
      supabase,
      userId: user.id,
      action: "document_generate",
      userLimit: profile.plan === "empresa" ? 80 : 50,
    });

    if (!actionRateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de documentos a medida por hora.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      await recordApiErrorEvent({
        supabase,
        userId: user.id,
        route: "/api/custom-generate",
        provider: "openai",
        errorCode: "openai_not_configured",
        severity: "high",
        message: "OPENAI_API_KEY no esta configurada.",
      });
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para generar documentos.");
    }

    const model = profile.plan === "free" ? DEFAULT_MODEL : PREMIUM_MODEL;
    const response = await openai.responses.create({
      model,
      instructions: documentInstructions,
      input: buildCustomDocumentPrompt({
        title: payload.title,
        description: payload.description,
        intendedUse: payload.intendedUse,
        tone: toneLabels[payload.tone],
        sector: payload.sector,
        requiredData: payload.requiredData,
      }),
      temperature: 0.3,
      max_output_tokens: 4000,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvió contenido. Inténtalo de nuevo.");
    }

    const formData = {
      title: payload.title,
      description: payload.description,
      intended_use: payload.intendedUse || "",
      tone: payload.tone,
      sector: payload.sector || "",
      required_data: payload.requiredData || "",
    };
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        doc_type: "custom",
        doc_label: payload.title,
        content,
        form_data: formData,
        model_used: model,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("custom_document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: requestInsertError } = await supabase.from("document_requests").insert({
      user_id: user.id,
      title: payload.title,
      description: payload.description,
      intended_use: payload.intendedUse || null,
      tone: payload.tone,
      sector: payload.sector || null,
      generated_document_id: document.id,
      status: "submitted",
    });

    if (requestInsertError) {
      console.error("document_request_insert_error", requestInsertError);
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("custom_profile_update_error", updateError);
    }

    await recordGenerationEvent(supabase, user.id);
    await recordActionRateLimitEvent(supabase, {
      userId: user.id,
      action: "document_generate",
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: payload.title,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("custom_document_ready_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: "custom",
      docLabel: payload.title,
      content,
      formData,
      modelUsed: model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa la descripción del documento.");
    }

    console.error("custom_generate_error", error);
    await recordApiErrorEvent({
      route: "/api/custom-generate",
      provider: "openai",
      errorCode: "generation_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "generation_failed", "No se pudo generar el documento personalizado.");
  }
}
