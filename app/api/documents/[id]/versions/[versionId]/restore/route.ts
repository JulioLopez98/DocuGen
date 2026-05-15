import { NextResponse } from "next/server";
import { documentVersionSelect, getDocumentVersions, getNextVersionNumber, insertDocumentVersions } from "@/lib/document-versions";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";
import type { DocumentVersionRow } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
    versionId: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para restaurar versiones.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { data: version, error: versionError } = await db
      .from("document_versions")
      .select(documentVersionSelect)
      .eq("id", params.versionId)
      .eq("document_id", params.id)
      .eq("user_id", user.id)
      .single<DocumentVersionRow>();

    if (versionError || !version) {
      console.error("document_version_restore_load_error", versionError);
      return errorResponse(404, "version_not_found", "No se pudo encontrar esa version.");
    }

    const { data: currentDocument, error: documentError } = await db
      .from("documents")
      .select("id,user_id,content")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single<{ id: string; user_id: string; content: string }>();

    if (documentError || !currentDocument) {
      console.error("document_restore_load_error", documentError);
      return errorResponse(404, "document_not_found", "No se pudo encontrar el documento.");
    }

    if (currentDocument.content !== version.content) {
      const { data: existingVersions, error: versionsLoadError } = await getDocumentVersions(db, params.id, user.id);

      if (versionsLoadError) {
        console.error("document_versions_restore_load_error", versionsLoadError);
        return errorResponse(500, "restore_failed", "No se pudo preparar la restauracion.");
      }

      const { error: insertError } = await insertDocumentVersions(db, [
        {
          document_id: params.id,
          user_id: user.id,
          version_number: getNextVersionNumber(existingVersions || []),
          content: version.content,
          change_source: "restored",
          change_summary: `Restaurada desde v${version.version_number}`,
        },
      ]);

      if (insertError) {
        console.error("document_restore_version_insert_error", insertError);
        return errorResponse(500, "restore_failed", "No se pudo guardar la version restaurada.");
      }
    }

    const { data: updatedDocument, error: updateError } = await db
      .from("documents")
      .update({ content: version.content })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("id,content")
      .single<{ id: string; content: string }>();

    if (updateError || !updatedDocument) {
      console.error("document_restore_update_error", updateError);
      return errorResponse(500, "restore_failed", "No se pudo restaurar la version.");
    }

    const { data: versions, error: versionsError } = await getDocumentVersions(db, params.id, user.id);

    if (versionsError) {
      console.error("document_versions_restore_reload_error", versionsError);
    }

    return NextResponse.json({
      document: updatedDocument,
      restoredFrom: version.version_number,
      versions: versions || [],
    });
  } catch (error) {
    console.error("document_version_restore_unhandled", error);
    return errorResponse(500, "restore_failed", "No se pudo restaurar la version.");
  }
}
