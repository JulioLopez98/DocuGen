export const templateUsageModes = ["structure_tone", "structure", "tone", "light"] as const;

export type TemplateUsageMode = (typeof templateUsageModes)[number];

export const defaultTemplateUsageMode: TemplateUsageMode = "structure_tone";

export const templateUsageLabels: Record<TemplateUsageMode, string> = {
  structure_tone: "Estructura + tono",
  structure: "Solo estructura",
  tone: "Tono y estilo",
  light: "Inspiracion ligera",
};

export const templateUsageDescriptions: Record<TemplateUsageMode, string> = {
  structure_tone: "Respeta el orden de apartados y el estilo general, sin copiar datos concretos.",
  structure: "Usa la plantilla como mapa de secciones, pero redacta con el estilo propio de DocuGen.",
  tone: "Mantiene un tono parecido, pero no replica el orden ni el formato exacto.",
  light: "Toma una referencia suave y prioriza el tipo documental elegido.",
};
