import type { SupabaseClient } from "@supabase/supabase-js";
import { recordOperationalAlert } from "@/lib/operational-alerts";

export type SecurityEventSeverity = "low" | "medium" | "high";

export type SecurityEventRow = {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  event_type: string;
  severity: SecurityEventSeverity;
  route: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function recordSecurityEvent(
  supabase: SupabaseClient,
  {
    userId,
    workspaceId = null,
    eventType,
    severity = "medium",
    route = null,
    summary,
    metadata = {},
  }: {
    userId: string | null;
    workspaceId?: string | null;
    eventType: string;
    severity?: SecurityEventSeverity;
    route?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("security_events")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      event_type: eventType,
      severity,
      route,
      summary,
      metadata,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("security_event_record_error", error);
    return;
  }

  if (severity === "high") {
    await recordOperationalAlert(supabase, {
      sourceEventId: data?.id || null,
      userId,
      workspaceId,
      alertType: eventType,
      severity,
      dedupeKey: [eventType, workspaceId || userId || "system", route || "unknown"].join(":"),
      title: "Evento sensible de alta severidad",
      description: summary,
      metadata,
    });
  }
}
