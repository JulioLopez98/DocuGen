import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para borrar documentos.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { error } = await db.from("documents").delete().eq("id", params.id).eq("user_id", user.id);

    if (error) {
      console.error("document_delete_error", error);
      return errorResponse(500, "delete_failed", "No se pudo borrar el documento.");
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("document_delete_unhandled", error);
    return errorResponse(500, "delete_failed", "No se pudo borrar el documento.");
  }
}
