import type { DocumentTemplateRow } from "@/lib/supabase-server";

export type TemplateQaLevel = "pending" | "ready" | "review" | "attention" | "blocked";

export type TemplateQaCheck = {
  label: string;
  status: "ok" | "review" | "missing" | "blocked";
  detail: string;
};

export type TemplateQaReport = {
  level: TemplateQaLevel;
  label: string;
  summary: string;
  score: number;
  checks: TemplateQaCheck[];
  warnings: string[];
  sensitiveSignals: string[];
};

export function getTemplateQaReport(template: Pick<DocumentTemplateRow, "status" | "extracted_text" | "extracted_metadata" | "error_message">): TemplateQaReport {
  const metadata = template.extracted_metadata || {};
  const quality = readRecord(metadata.quality);
  const qualityScore = readNumber(quality?.score) ?? 0;
  const qualityWarnings = readStringArray(quality?.warnings);
  const sensitiveSignals = readStringArray(metadata.sensitiveSignals);
  const sections = Array.isArray(metadata.sections) ? metadata.sections.length : 0;
  const variables = Array.isArray(metadata.variables) ? metadata.variables.length : 0;
  const words = readNumber(metadata.words) ?? countWords(template.extracted_text || "");
  const checks: TemplateQaCheck[] = [
    {
      label: "Texto extraido",
      status: words >= 80 ? "ok" : template.extracted_text ? "review" : "missing",
      detail: template.extracted_text ? `${words} palabras detectadas.` : "Procesa la plantilla para extraer texto.",
    },
    {
      label: "Estructura",
      status: sections >= 3 ? "ok" : sections >= 1 ? "review" : "missing",
      detail: sections > 0 ? `${sections} secciones detectadas.` : "No hay secciones claras.",
    },
    {
      label: "Variables",
      status: variables > 0 ? "ok" : "review",
      detail: variables > 0 ? `${variables} variables revisables.` : "Anade variables para generar desde esta plantilla con mas precision.",
    },
    {
      label: "Datos concretos",
      status: sensitiveSignals.length > 0 ? "review" : "ok",
      detail:
        sensitiveSignals.length > 0
          ? `Detectado: ${sensitiveSignals.join(", ")}. No se copiaran, pero conviene revisar.`
          : "No se han detectado senales sensibles destacadas.",
    },
    {
      label: "Calidad",
      status: qualityScore >= 80 ? "ok" : qualityScore >= 60 ? "review" : "missing",
      detail: qualityScore > 0 ? `Puntuacion ${qualityScore}/100.` : "Procesa la plantilla para calcular calidad.",
    },
  ];

  if (template.status === "failed") {
    return {
      level: "blocked",
      label: "Bloqueada",
      summary: template.error_message || "No se pudo procesar la plantilla.",
      score: qualityScore,
      checks: checks.map((check) => (check.label === "Texto extraido" ? { ...check, status: "blocked" } : check)),
      warnings: [template.error_message || "Procesamiento fallido.", ...qualityWarnings],
      sensitiveSignals,
    };
  }

  if (template.status === "uploaded" || template.status === "processing") {
    return {
      level: "pending",
      label: template.status === "processing" ? "Procesando" : "Pendiente",
      summary:
        template.status === "processing"
          ? "La plantilla se esta analizando."
          : "Procesa la plantilla para activar QA, variables y generacion directa.",
      score: qualityScore,
      checks,
      warnings: qualityWarnings,
      sensitiveSignals,
    };
  }

  if (!template.extracted_text) {
    return {
      level: "blocked",
      label: "Sin texto",
      summary: "La plantilla figura como lista, pero no tiene texto extraido.",
      score: qualityScore,
      checks,
      warnings: ["Falta texto extraido.", ...qualityWarnings],
      sensitiveSignals,
    };
  }

  const missingCritical = checks.some((check) => check.status === "missing" || check.status === "blocked");
  const needsReview = checks.some((check) => check.status === "review") || qualityWarnings.length > 0;

  if (missingCritical || qualityScore < 60) {
    return {
      level: "attention",
      label: "Revisar",
      summary: "La plantilla puede usarse, pero conviene mejorar estructura, variables o calidad antes de confiar en ella.",
      score: qualityScore,
      checks,
      warnings: qualityWarnings,
      sensitiveSignals,
    };
  }

  if (needsReview) {
    return {
      level: "review",
      label: "Lista con avisos",
      summary: "La plantilla esta lista, pero revisa los avisos antes de usarla con documentos importantes.",
      score: qualityScore,
      checks,
      warnings: qualityWarnings,
      sensitiveSignals,
    };
  }

  return {
    level: "ready",
    label: "Lista",
    summary: "Plantilla preparada para generar documentos y usarse como referencia.",
    score: qualityScore,
    checks,
    warnings: qualityWarnings,
    sensitiveSignals,
  };
}

export function getTemplateQaStyles(level: TemplateQaLevel) {
  const styles: Record<TemplateQaLevel, string> = {
    pending: "border-slate-200 bg-slate-50 text-slate-700",
    ready: "border-[#2d6a4f] bg-[#d8f3dc] text-[#1f2933]",
    review: "border-amber-200 bg-amber-50 text-amber-900",
    attention: "border-orange-200 bg-orange-50 text-orange-900",
    blocked: "border-red-200 bg-red-50 text-red-800",
  };

  return styles[level];
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}
