import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function DELETE() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para borrar el historial.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { error } = await db.from("documents").delete().eq("user_id", user.id);

    if (error) {
      console.error("history_clear_error", error);
      return errorResponse(500, "clear_failed", "No se pudo borrar el historial.");
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("history_clear_unhandled", error);
    return errorResponse(500, "clear_failed", "No se pudo borrar el historial.");
  }
}
