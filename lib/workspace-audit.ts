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
  notify?: boolean;
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
  notify = true,
}: RecordWorkspaceAuditEventInput) {
  if (!workspaceId) {
    return;
  }

  const db = createSupabaseServiceClient() || supabase;

  if (!db) {
    console.log("workspace_audit_skipped", { eventType, workspaceId, reason: "no_supabase_client" });
    return;
  }

  const { data: auditEvent, error } = await db
    .from("workspace_audit_events")
    .insert({
      workspace_id: workspaceId,
      actor_id: actorId || null,
      event_type: eventType,
      target_type: targetType || null,
      target_id: targetId || null,
      summary,
      metadata,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("workspace_audit_insert_error", error);
    return;
  }

  if (!notify || !auditEvent) {
    return;
  }

  const { data: members, error: membersError } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .returns<Array<{ user_id: string }>>();

  if (membersError) {
    console.error("workspace_notification_members_error", membersError);
    return;
  }

  const recipients = (members || [])
    .map((member) => member.user_id)
    .filter((userId, index, list) => userId !== actorId && list.indexOf(userId) === index);

  if (recipients.length === 0) {
    return;
  }

  const { error: notificationError } = await db.from("workspace_notifications").insert(
    recipients.map((userId) => ({
      workspace_id: workspaceId,
      user_id: userId,
      actor_id: actorId || null,
      audit_event_id: auditEvent.id,
      notification_type: eventType,
      title: getNotificationTitle(eventType),
      body: summary,
      href: getNotificationHref(targetType, targetId),
    })),
  );

  if (notificationError) {
    console.error("workspace_notification_insert_error", notificationError);
  }
}

function getNotificationTitle(eventType: WorkspaceAuditEventType) {
  const titles: Record<WorkspaceAuditEventType, string> = {
    document_created: "Nuevo documento en el workspace",
    document_deleted: "Documento eliminado",
    documents_cleared: "Historial actualizado",
    template_uploaded: "Nueva plantilla compartida",
    template_processed: "Plantilla procesada",
    template_updated: "Plantilla actualizada",
    template_deleted: "Plantilla eliminada",
    member_invited: "Invitacion enviada",
    member_joined: "Nuevo miembro en el workspace",
    member_role_updated: "Rol actualizado",
    member_permissions_updated: "Permisos actualizados",
    member_removed: "Miembro eliminado",
    invitation_revoked: "Invitacion revocada",
  };

  return titles[eventType];
}

function getNotificationHref(targetType?: string | null, targetId?: string | null) {
  if (targetType === "document" && targetId) {
    return `/historial/${targetId}`;
  }

  if (targetType === "template" && targetId) {
    return `/plantillas/${targetId}`;
  }

  return "/workspace";
}
