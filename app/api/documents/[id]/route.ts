import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDocumentVersions,
  getNextVersionNumber,
  insertDocumentVersions,
  type DocumentVersionInsert,
} from "@/lib/document-versions";
import { createSupabaseServiceClient, requireUser, type DocumentRow, type Profile } from "@/lib/supabase-server";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { canUseWorkspace } from "@/lib/workspace-access";

const documentUpdateSchema = z.object({
  content: z.string().trim().min(1).max(100000),
  changeSource: z.enum(["manual", "ai_improvement"]).optional(),
  changeSummary: z.string().trim().max(300).optional(),
  aiMode: z.string().trim().max(80).optional(),
  modelUsed: z.string().trim().max(120).optional(),
  tokensInput: z.number().int().nonnegative().nullable().optional(),
  tokensOutput: z.number().int().nonnegative().nullable().optional(),
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
      return errorResponse(401, "unauthorized", "Inicia sesiÃ³n para guardar documentos.");
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

    const versionsToInsert: DocumentVersionInsert[] = [];
    let nextVersionNumber = getNextVersionNumber(existingVersions || []);

    if (!existingVersions || existingVersions.length === 0) {
      versionsToInsert.push({
        document_id: params.id,
        user_id: user.id,
        version_number: 1,
        content: currentDocument.content,
        change_source: "original",
        change_summary: "Contenido original",
      });
      nextVersionNumber = 2;
    }

    const changeSource = payload.changeSource || "manual";
    versionsToInsert.push({
      document_id: params.id,
      user_id: user.id,
      version_number: nextVersionNumber,
      content: payload.content,
      change_source: changeSource,
      change_summary: payload.changeSummary || (changeSource === "ai_improvement" ? "Mejora con IA" : "Edicion manual"),
      ai_mode: changeSource === "ai_improvement" ? payload.aiMode || null : null,
      model_used: changeSource === "ai_improvement" ? payload.modelUsed || null : null,
      tokens_input: changeSource === "ai_improvement" ? payload.tokensInput ?? null : null,
      tokens_output: changeSource === "ai_improvement" ? payload.tokensOutput ?? null : null,
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
      return errorResponse(400, "invalid_payload", "El documento no puede estar vacÃ­o.");
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
    const { data: document, error: documentError } = await db
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .maybeSingle<DocumentRow>();

    if (documentError) {
      console.error("document_delete_load_error", documentError);
      return errorResponse(500, "delete_failed", "No se pudo preparar el borrado del documento.");
    }

    if (!document) {
      return NextResponse.json({ deleted: true, alreadyDeleted: true });
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("document_delete_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    const canDeleteOwnDocument = document.user_id === user.id;
    const workspaceAccess = canDeleteOwnDocument
      ? { allowed: true }
      : await canUseWorkspace(supabase, user.id, profile, document.workspace_id, "create_documents");

    if (!canDeleteOwnDocument && !workspaceAccess.allowed && profile.role !== "admin") {
      return errorResponse(403, "permission_denied", "No tienes permiso para borrar este documento.");
    }

    const { error: requestUpdateError } = await db
      .from("document_requests")
      .update({ generated_document_id: null })
      .eq("generated_document_id", params.id);

    if (requestUpdateError) {
      console.error("document_delete_request_reference_error", requestUpdateError);
      return errorResponse(500, "delete_failed", "No se pudo preparar el borrado del documento.");
    }

    const { error: versionDeleteError } = await db
      .from("document_versions")
      .delete()
      .eq("document_id", params.id);

    if (versionDeleteError) {
      console.error("document_delete_versions_error", versionDeleteError);
      return errorResponse(500, "delete_failed", "No se pudieron borrar las versiones del documento.");
    }

    const { error } = await db.from("documents").delete().eq("id", params.id);

    if (error) {
      console.error("document_delete_error", error);
      return errorResponse(500, "delete_failed", "No se pudo borrar el documento.");
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: document.workspace_id,
      actorId: user.id,
      eventType: "document_deleted",
      targetType: "document",
      targetId: document.id,
      summary: `Borro ${document.doc_label}`,
      metadata: {
        docType: document.doc_type,
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("document_delete_unhandled", error);
    return errorResponse(500, "delete_failed", "No se pudo borrar el documento.");
  }
}