import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAssistantDocumentPrompt, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { checkGenerationRateLimit, recordGenerationEvent } from "@/lib/rate-limit";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type ChatMessageRow, type ChatSessionRow, type Profile } from "@/lib/supabase-server";

const assistantGenerateSchema = z.object({
  sessionId: z.string().uuid(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para generar desde el asistente.");
    }

    const payload = assistantGenerateSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("assistant_generate_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "La generacion guiada desde chat esta disponible solo en DocuGen Pro.");
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", payload.sessionId)
      .eq("user_id", user.id)
      .single<ChatSessionRow>();

    if (sessionError || !session) {
      console.error("assistant_generate_session_error", sessionError);
      return errorResponse(404, "session_not_found", "No se encontro la conversacion.");
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .returns<ChatMessageRow[]>();

    if (messagesError || !messages || messages.length === 0) {
      console.error("assistant_generate_messages_error", messagesError);
      return errorResponse(400, "conversation_empty", "La conversacion aun no tiene datos suficientes.");
    }

    const userMessages = messages.filter((message) => message.role === "user");

    if (userMessages.length === 0) {
      return errorResponse(400, "conversation_empty", "Escribe primero que documento necesitas.");
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de generaciones por hora.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para generar documentos.");
    }

    const response = await openai.responses.create({
      model: PREMIUM_MODEL,
      instructions: documentInstructions,
      input: buildAssistantDocumentPrompt(
        messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      ),
      temperature: 0.25,
      max_output_tokens: 4200,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvio contenido. Intentalo de nuevo.");
    }

    const docLabel = buildDocumentLabel(userMessages[0]?.content);
    const formData = {
      source: "assistant_chat",
      session_id: session.id,
      first_message: userMessages[0]?.content || "",
    };
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        doc_type: "assistant",
        doc_label: docLabel,
        content,
        form_data: formData,
        model_used: PREMIUM_MODEL,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("assistant_document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: requestInsertError } = await supabase.from("document_requests").insert({
      user_id: user.id,
      title: docLabel,
      description: messages.map((message) => `${message.role}: ${message.content}`).join("\n\n").slice(0, 5000),
      intended_use: "Generado desde asistente conversacional",
      tone: "formal",
      generated_document_id: document.id,
      status: "submitted",
    });

    if (requestInsertError) {
      console.error("assistant_document_request_insert_error", requestInsertError);
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("assistant_profile_update_error", profileUpdateError);
    }

    const { error: sessionUpdateError } = await supabase
      .from("chat_sessions")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", user.id);

    if (sessionUpdateError) {
      console.error("assistant_session_complete_error", sessionUpdateError);
    }

    await recordGenerationEvent(supabase, user.id);

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: docLabel,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("assistant_document_ready_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: "assistant",
      docLabel,
      content,
      formData,
      modelUsed: PREMIUM_MODEL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona una conversacion valida.");
    }

    console.error("assistant_generate_error", error);
    return errorResponse(500, "generation_failed", "No se pudo generar el documento desde el chat.");
  }
}

function buildDocumentLabel(firstMessage?: string) {
  const clean = firstMessage?.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "Documento guiado";
  }

  const short = clean.length > 72 ? `${clean.slice(0, 69).trim()}...` : clean;
  return `Documento guiado: ${short}`;
}
