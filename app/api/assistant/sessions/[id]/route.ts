import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireUser, type ChatSessionRow } from "@/lib/supabase-server";

type Params = {
  params: {
    id: string;
  };
};

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para borrar conversaciones.");
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single<ChatSessionRow>();

    if (sessionError || !session) {
      return errorResponse(404, "session_not_found", "No se encontró la conversación.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "No se pudo borrar la conversación en este entorno.");
    }

    const { error: deleteError } = await db.from("chat_sessions").delete().eq("id", session.id).eq("user_id", user.id);

    if (deleteError) {
      console.error("assistant_session_delete_error", deleteError);
      return errorResponse(500, "delete_failed", "No se pudo borrar la conversación.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("assistant_session_delete_unhandled", error);
    return errorResponse(500, "delete_failed", "No se pudo borrar la conversación.");
  }
}
