export type AnalyticsEvent =
  | "document_generated"
  | "limit_reached"
  | "upgrade_started"
  | "upgrade_completed"
  | "document_downloaded";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean | null> = {}) {
  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", event, properties);
  }
}
