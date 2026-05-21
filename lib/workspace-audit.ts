import { createSupabaseServiceClient, type WorkspaceAuditEventType } from "@/lib/supabase-server";
import type { requireUser } from "@/lib/supabase-server";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>;

type RecordWorkspaceAuditEventInput = {
  supabase?: SupabaseServerClient | null;
  workspaceId?: string | null;
  actorId?: string | null;
  eventType: WorkspaceAuditEventType;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordWorkspaceAuditEvent({
  supabase,
  workspaceId,
  actorId,
  eventType,
  targetType,
  targetId,
  summary,
  metadata = {},
}: RecordWorkspaceAuditEventInput) {
  if (!workspaceId) {
    return;
  }

  const db = createSupabaseServiceClient() || supabase;

  if (!db) {
    console.log("workspace_audit_skipped", { eventType, workspaceId, reason: "no_supabase_client" });
    return;
  }

  const { error } = await db.from("workspace_audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId || null,
    event_type: eventType,
    target_type: targetType || null,
    target_id: targetId || null,
    summary,
    metadata,
  });

  if (error) {
    console.error("workspace_audit_insert_error", error);
  }
}
