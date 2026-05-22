import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildEditableImprovementPrompt,
  DEFAULT_MODEL,
  documentInstructions,
  getOpenAIClient,
  PREMIUM_MODEL,
} from "@/lib/openai";
import { checkActionRateLimit, checkGenerationRateLimit, recordActionRateLimitEvent, recordGenerationEvent } from "@/lib/rate-limit";
import { createSupabaseServiceClient, requireUser, type Profile } from "@/lib/supabase-server";

const improvePayloadSchema = z.object({
  content: z.string().trim().min(1).max(80000),
  mode: z.enum(["formal", "brief", "commercial", "natural", "legal_review", "custom"]),
  customInstruction: z.string().trim().max(1000).optional(),
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
      return errorResponse(401, "unauthorized", "Inicia sesión para mejorar documentos.");
    }

    const payload = improvePayloadSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;

    const { data: document, error: documentError } = await db
      .from("documents")
      .select("id,user_id,doc_type,doc_label")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single<{ id: string; user_id: string; doc_type: string; doc_label: string }>();

    if (documentError || !document) {
      console.error("document_improve_load_error", documentError);
      return errorResponse(404, "document_not_found", "No se pudo encontrar el documento.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("document_improve_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el límite de mejoras con IA por hora.");
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
    const response = await openai.responses.create({
      model,
      instructions: documentInstructions,
      input: buildEditableImprovementPrompt({
        title: document.doc_label,
        docType: document.doc_type,
        content: payload.content,
        mode: payload.mode,
        customInstruction: payload.customInstruction,
      }),
      temperature: payload.mode === "commercial" || payload.mode === "natural" ? 0.35 : 0.25,
      max_output_tokens: 5000,
    });
    const improvedContent = response.output_text?.trim();

    if (!improvedContent) {
      return errorResponse(502, "empty_generation", "La IA no devolvió contenido. Inténtalo de nuevo.");
    }

    await recordGenerationEvent(supabase, user.id);
    await recordActionRateLimitEvent(supabase, {
      userId: user.id,
      action: "document_improve",
    });

    return NextResponse.json({
      document: {
        id: document.id,
        content: improvedContent,
      },
      modelUsed: model,
      aiMode: payload.mode,
      tokensInput: response.usage?.input_tokens ?? null,
      tokensOutput: response.usage?.output_tokens ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el texto y la instrucción de mejora.");
    }

    console.error("document_improve_unhandled", error);
    return errorResponse(500, "improve_failed", "No se pudo mejorar el documento.");
  }
}
