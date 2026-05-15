import type { TemplateUsageMode } from "@/lib/template-usage";

export type TemplateUsageMetricEvent = {
  reference_template_id: string | null;
  template_usage_mode: TemplateUsageMode | null;
  created_at: string;
};

export type TemplateUsageMetrics = {
  totalUses: number;
  lastUsedAt: string | null;
  modeCounts: Partial<Record<TemplateUsageMode, number>>;
  mostUsedMode: TemplateUsageMode | null;
};

export type TemplateUsageMetricsMap = Record<string, TemplateUsageMetrics>;

export function buildTemplateUsageMetrics(events: TemplateUsageMetricEvent[]): TemplateUsageMetricsMap {
  const metrics: TemplateUsageMetricsMap = {};

  for (const event of events) {
    if (!event.reference_template_id) {
      continue;
    }

    const current = metrics[event.reference_template_id] || createEmptyTemplateUsageMetrics();
    current.totalUses += 1;

    if (!current.lastUsedAt || new Date(event.created_at).getTime() > new Date(current.lastUsedAt).getTime()) {
      current.lastUsedAt = event.created_at;
    }

    if (event.template_usage_mode) {
      current.modeCounts[event.template_usage_mode] = (current.modeCounts[event.template_usage_mode] || 0) + 1;
      current.mostUsedMode = getMostUsedMode(current.modeCounts);
    }

    metrics[event.reference_template_id] = current;
  }

  return metrics;
}

export function createEmptyTemplateUsageMetrics(): TemplateUsageMetrics {
  return {
    totalUses: 0,
    lastUsedAt: null,
    modeCounts: {},
    mostUsedMode: null,
  };
}

export function getTemplateUsageMetrics(metrics: TemplateUsageMetricsMap, templateId: string) {
  return metrics[templateId] || createEmptyTemplateUsageMetrics();
}

function getMostUsedMode(modeCounts: Partial<Record<TemplateUsageMode, number>>) {
  let bestMode: TemplateUsageMode | null = null;
  let bestCount = 0;

  for (const [mode, count] of Object.entries(modeCounts) as Array<[TemplateUsageMode, number]>) {
    if (count > bestCount) {
      bestMode = mode;
      bestCount = count;
    }
  }

  return bestMode;
}
