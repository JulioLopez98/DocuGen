import type { SupabaseClient } from "@supabase/supabase-js";
import { recordOperationalAlert } from "@/lib/operational-alerts";
import type { SecurityEventSeverity } from "@/lib/security-events";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

export type ApiErrorProvider = "openai" | "stripe" | "resend" | "supabase" | "app";

export type ApiErrorEventRow = {
  id: string;
  user_id: string | null;
  route: string;
  provider: ApiErrorProvider;
  error_code: string;
  severity: SecurityEventSeverity;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function recordApiErrorEvent({
  supabase,
  userId = null,
  route,
  provider,
  errorCode,
  severity = "medium",
  message,
  metadata = {},
}: {
  supabase?: SupabaseClient | null;
  userId?: string | null;
  route: string;
  provider: ApiErrorProvider;
  errorCode: string;
  severity?: SecurityEventSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const db = supabase || createSupabaseServiceClient();

  if (!db) {
    console.error("api_error_monitor_missing_supabase", { route, provider, errorCode });
    return;
  }

  const safeMessage = message.slice(0, 600);
  const { data, error } = await db
    .from("api_error_events")
    .insert({
      user_id: userId,
      route,
      provider,
      error_code: errorCode,
      severity,
      message: safeMessage,
      metadata,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("api_error_event_record_error", error);
    return;
  }

  if (severity === "high") {
    await recordOperationalAlert(db, {
      sourceEventId: null,
      userId,
      alertType: `api_error:${provider}`,
      severity,
      dedupeKey: ["api_error", provider, route, errorCode].join(":"),
      title: `Fallo critico en ${provider}`,
      description: safeMessage,
      metadata: {
        apiErrorEventId: data?.id || null,
        route,
        provider,
        errorCode,
        ...metadata,
      },
    });
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Error desconocido";
}
