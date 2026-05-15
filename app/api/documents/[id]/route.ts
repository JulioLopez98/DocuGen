import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";

const documentUpdateSchema = z.object({
  content: z.string().trim().min(1).max(100000),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para guardar documentos.");
    }

    const payload = documentUpdateSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const { data, error } = await db
      .from("documents")
      .update({ content: payload.content })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("id,content")
      .single<{ id: string; content: string }>();

    if (error || !data) {
      console.error("document_update_error", error);
      return errorResponse(500, "update_failed", "No se pudo guardar el documento.");
    }

    return NextResponse.json({ document: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "El documento no puede estar vacío.");
    }

    console.error("document_update_unhandled", error);
    return errorResponse(500, "update_failed", "No se pudo guardar el documento.");
  }
}

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
