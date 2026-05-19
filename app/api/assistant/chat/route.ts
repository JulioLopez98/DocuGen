import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAssistantChatPrompt, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { requireUser, type ChatMessageRow, type ChatSessionRow, type Profile } from "@/lib/supabase-server";

const assistantChatSchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  message: z.string().trim().min(2).max(4000),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para usar el asistente.");
    }

    const payload = assistantChatSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("assistant_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "El asistente conversacional esta disponible solo en DocuGen Pro.");
    }

    const session = payload.sessionId
      ? await getExistingSession(supabase, user.id, payload.sessionId)
      : await createSession(supabase, user.id);

    if (session instanceof NextResponse) {
      return session;
    }

    const { error: userMessageError } = await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: payload.message,
    });

    if (userMessageError) {
      console.error("assistant_user_message_error", userMessageError);
      return errorResponse(500, "message_save_failed", "No se pudo guardar tu mensaje.");
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(24)
      .returns<ChatMessageRow[]>();

    if (messagesError) {
      console.error("assistant_messages_error", messagesError);
      return errorResponse(500, "messages_load_failed", "No se pudo cargar la conversacion.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para usar el asistente.");
    }

    const response = await openai.responses.create({
      model: PREMIUM_MODEL,
      instructions: documentInstructions,
      input: buildAssistantChatPrompt(
        (messages || [])
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      ),
      temperature: 0.25,
      max_output_tokens: 1200,
    });
    const assistantContent = response.output_text?.trim();

    if (!assistantContent) {
      return errorResponse(502, "empty_assistant_response", "El asistente no devolvio respuesta. Intentalo de nuevo.");
    }

    const { data: assistantMessage, error: assistantMessageError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: session.id,
        role: "assistant",
        content: assistantContent,
      })
      .select("*")
      .single<ChatMessageRow>();

    if (assistantMessageError || !assistantMessage) {
      console.error("assistant_message_save_error", assistantMessageError);
      return errorResponse(500, "assistant_save_failed", "No se pudo guardar la respuesta del asistente.");
    }

    const { error: sessionUpdateError } = await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("user_id", user.id);

    if (sessionUpdateError) {
      console.error("assistant_session_update_error", sessionUpdateError);
    }

    return NextResponse.json({
      sessionId: session.id,
      message: assistantMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Escribe un mensaje un poco mas concreto.");
    }

    console.error("assistant_chat_error", error);
    return errorResponse(500, "assistant_failed", "No se pudo responder desde el asistente.");
  }
}

async function createSession(
  supabase: NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId, status: "active" })
    .select("*")
    .single<ChatSessionRow>();

  if (error || !data) {
    console.error("assistant_session_create_error", error);
    return errorResponse(500, "session_create_failed", "No se pudo crear la conversacion.");
  }

  return data;
}

async function getExistingSession(
  supabase: NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>,
  userId: string,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single<ChatSessionRow>();

  if (error || !data) {
    console.error("assistant_session_find_error", error);
    return errorResponse(404, "session_not_found", "No se encontro la conversacion.");
  }

  return data;
}
