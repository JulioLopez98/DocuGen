import type { SupabaseClient } from "@supabase/supabase-js";
import type { SecurityEventSeverity } from "@/lib/security-events";

export type OperationalAlertStatus = "open" | "acknowledged" | "resolved";

export type OperationalAlertRow = {
  id: string;
  source_event_id: string | null;
  user_id: string | null;
  workspace_id: string | null;
  alert_type: string;
  severity: SecurityEventSeverity;
  status: OperationalAlertStatus;
  dedupe_key: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export async function recordOperationalAlert(
  supabase: SupabaseClient,
  {
    sourceEventId = null,
    userId,
    workspaceId = null,
    alertType,
    severity = "medium",
    dedupeKey,
    title,
    description,
    metadata = {},
  }: {
    sourceEventId?: string | null;
    userId: string | null;
    workspaceId?: string | null;
    alertType: string;
    severity?: SecurityEventSeverity;
    dedupeKey: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("operational_alerts").insert({
    source_event_id: sourceEventId,
    user_id: userId,
    workspace_id: workspaceId,
    alert_type: alertType,
    severity,
    dedupe_key: dedupeKey,
    title,
    description,
    metadata,
  });

  if (error && error.code !== "23505") {
    console.error("operational_alert_record_error", error);
  }
}
