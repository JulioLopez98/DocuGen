import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function DELETE() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesiÃ³n para borrar el historial.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { data: workspaceDocuments, error: workspaceDocumentsError } = await db
      .from("documents")
      .select("workspace_id")
      .eq("user_id", user.id)
      .not("workspace_id", "is", null)
      .returns<Array<{ workspace_id: string | null }>>();

    if (workspaceDocumentsError) {
      console.error("history_clear_workspace_lookup_error", workspaceDocumentsError);
    }

    const { data: userDocuments, error: userDocumentsError } = await db
      .from("documents")
      .select("id")
      .eq("user_id", user.id)
      .returns<Array<{ id: string }>>();

    if (userDocumentsError) {
      console.error("history_clear_document_lookup_error", userDocumentsError);
      return errorResponse(500, "clear_failed", "No se pudo preparar el borrado del historial.");
    }

    const documentIds = (userDocuments || []).map((document) => document.id);

    if (documentIds.length > 0) {
      const { error: requestUpdateError } = await db
        .from("document_requests")
        .update({ generated_document_id: null })
        .in("generated_document_id", documentIds)
        .eq("user_id", user.id);

      if (requestUpdateError) {
        console.error("history_clear_request_reference_error", requestUpdateError);
        return errorResponse(500, "clear_failed", "No se pudo preparar el borrado del historial.");
      }

      const { error: versionDeleteError } = await db
        .from("document_versions")
        .delete()
        .in("document_id", documentIds)
        .eq("user_id", user.id);

      if (versionDeleteError) {
        console.error("history_clear_versions_error", versionDeleteError);
        return errorResponse(500, "clear_failed", "No se pudieron borrar las versiones del historial.");
      }
    }

    const { error } = await db.from("documents").delete().eq("user_id", user.id);

    if (error) {
      console.error("history_clear_error", error);
      return errorResponse(500, "clear_failed", "No se pudo borrar el historial.");
    }

    const workspaceCounts = new Map<string, number>();
    for (const document of workspaceDocuments || []) {
      if (document.workspace_id) {
        workspaceCounts.set(document.workspace_id, (workspaceCounts.get(document.workspace_id) || 0) + 1);
      }
    }

    await Promise.all(
      Array.from(workspaceCounts.entries()).map(([workspaceId, count]) =>
        recordWorkspaceAuditEvent({
          workspaceId,
          actorId: user.id,
          eventType: "documents_cleared",
          summary: `Borro ${count} documento${count === 1 ? "" : "s"} del historial`,
          metadata: { count },
        }),
      ),
    );

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("history_clear_unhandled", error);
    return errorResponse(500, "clear_failed", "No se pudo borrar el historial.");
  }
}
