import { NextResponse } from "next/server";
import { z } from "zod";
import { getDocumentVersions, getNextVersionNumber, insertDocumentVersions } from "@/lib/document-versions";
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
    const { data: currentDocument, error: documentError } = await db
      .from("documents")
      .select("id,user_id,content")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single<{ id: string; user_id: string; content: string }>();

    if (documentError || !currentDocument) {
      console.error("document_update_load_error", documentError);
      return errorResponse(404, "document_not_found", "No se pudo encontrar el documento.");
    }

    if (currentDocument.content === payload.content) {
      const { data: versions, error: versionsError } = await getDocumentVersions(db, params.id, user.id);

      if (versionsError) {
        console.error("document_versions_load_error", versionsError);
      }

      return NextResponse.json({ document: { id: currentDocument.id, content: currentDocument.content }, versions: versions || [] });
    }

    const { data: existingVersions, error: versionsLoadError } = await getDocumentVersions(db, params.id, user.id);

    if (versionsLoadError) {
      console.error("document_versions_load_error", versionsLoadError);
      return errorResponse(500, "version_failed", "No se pudo preparar el historial de versiones.");
    }

    const versionsToInsert = [];
    let nextVersionNumber = getNextVersionNumber(existingVersions || []);

    if (!existingVersions || existingVersions.length === 0) {
      versionsToInsert.push({
        document_id: params.id,
        user_id: user.id,
        version_number: 1,
        content: currentDocument.content,
        change_summary: "Contenido original",
      });
      nextVersionNumber = 2;
    }

    versionsToInsert.push({
      document_id: params.id,
      user_id: user.id,
      version_number: nextVersionNumber,
      content: payload.content,
      change_summary: "Edicion manual",
    });

    const { error: versionInsertError } = await insertDocumentVersions(db, versionsToInsert);

    if (versionInsertError) {
      console.error("document_version_insert_error", versionInsertError);
      return errorResponse(500, "version_failed", "No se pudo guardar la version del documento.");
    }

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

    const { data: versions, error: versionsError } = await getDocumentVersions(db, params.id, user.id);

    if (versionsError) {
      console.error("document_versions_reload_error", versionsError);
    }

    return NextResponse.json({ document: data, versions: versions || [] });
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
