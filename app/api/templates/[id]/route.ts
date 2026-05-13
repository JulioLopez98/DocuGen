import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type DocumentTemplateRow } from "@/lib/supabase-server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

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
      return errorResponse(401, "unauthorized", "Inicia sesión para borrar plantillas.");
    }

    const { id } = paramsSchema.parse(params);
    const { data: template, error: findError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single<DocumentTemplateRow>();

    if (findError || !template) {
      return errorResponse(404, "template_not_found", "No se encontró la plantilla.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { error: storageError } = await db.storage.from(template.storage_bucket).remove([template.storage_path]);

    if (storageError) {
      console.error("template_storage_delete_error", storageError);
      return errorResponse(500, "template_delete_failed", "No se pudo borrar el archivo de la plantilla.");
    }

    const { error: deleteError } = await db.from("document_templates").delete().eq("id", id).eq("user_id", user.id);

    if (deleteError) {
      console.error("template_delete_error", deleteError);
      return errorResponse(500, "template_delete_failed", "No se pudo borrar la plantilla.");
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_template_id", "Identificador de plantilla no válido.");
    }

    console.error("template_delete_unhandled", error);
    return errorResponse(500, "template_delete_failed", "No se pudo borrar la plantilla.");
  }
}
