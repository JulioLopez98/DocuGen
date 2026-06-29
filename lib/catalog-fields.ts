import { z } from "zod";
import { DEFAULT_MODEL, getOpenAIClient } from "@/lib/openai";
import type { DocumentRow } from "@/lib/supabase-server";

export type CatalogFieldType = "text" | "textarea" | "date" | "email" | "number";

export type CatalogField = {
  name: string;
  label: string;
  type: CatalogFieldType;
  required?: boolean;
  helpText?: string;
};

const catalogFieldSchema = z.object({
  name: z.string().min(2).max(60),
  label: z.string().min(2).max(90),
  type: z.enum(["text", "textarea", "date", "email", "number"]),
  required: z.boolean().optional().default(false),
  helpText: z.string().max(180).optional(),
});

const catalogFieldResponseSchema = z.object({
  fields: z.array(catalogFieldSchema).min(4).max(14),
});

export async function inferCatalogFields(document: DocumentRow, label: string, description: string): Promise<CatalogField[]> {
  const openai = getOpenAIClient();

  if (!openai) {
    return buildFallbackCatalogFields(document);
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL_DEFAULT || DEFAULT_MODEL,
      instructions: [
        "Eres un analista de documentos profesionales para España.",
        "Tu tarea es convertir un documento generado en un esquema de campos reutilizables para un formulario.",
        "Devuelve solo JSON válido, sin markdown ni explicaciones.",
        "No incluyas datos concretos del documento como valores; convierte esos datos en nombres de campos.",
        "Prioriza campos que el usuario necesitará rellenar la próxima vez para generar un documento del mismo tipo.",
        "Usa nombres snake_case, labels claros en español y helpText breve cuando aporte contexto.",
        "Tipos permitidos: text, textarea, date, email, number.",
      ].join("\n"),
      input: [
        `Tipo a guardar: ${label}`,
        `Descripción: ${description}`,
        "Documento de referencia:",
        document.content.slice(0, 7000),
        "Datos estructurados disponibles:",
        JSON.stringify(stripInternalFormData(document.form_data || {})).slice(0, 2500),
        "Formato exacto esperado:",
        '{"fields":[{"name":"cliente","label":"Cliente","type":"text","required":true,"helpText":"Nombre o razón social del cliente"}]}',
      ].join("\n\n"),
      temperature: 0.1,
      max_output_tokens: 1200,
    });

    const parsed = parseCatalogFieldResponse(response.output_text || "");
    return parsed.length > 0 ? parsed : buildFallbackCatalogFields(document);
  } catch (error) {
    console.error("catalog_fields_inference_error", error);
    return buildFallbackCatalogFields(document);
  }
}

export function buildFallbackCatalogFields(document: DocumentRow): CatalogField[] {
  const fields: CatalogField[] = [
    {
      name: "contexto",
      label: "Contexto del documento",
      type: "textarea",
      required: true,
      helpText: "Explica para qué se usará este documento.",
    },
    {
      name: "partes_implicadas",
      label: "Partes implicadas",
      type: "textarea",
      required: true,
      helpText: "Personas, empresas u organizaciones que intervienen.",
    },
    {
      name: "datos_clave",
      label: "Datos clave",
      type: "textarea",
      required: true,
      helpText: "Importes, fechas, documentos, servicios o hechos relevantes.",
    },
    {
      name: "condiciones",
      label: "Condiciones o puntos importantes",
      type: "textarea",
      required: false,
      helpText: "Añade condiciones, límites, plazos o instrucciones especiales.",
    },
    { name: "fecha", label: "Fecha", type: "date", required: false },
    { name: "observaciones", label: "Observaciones adicionales", type: "textarea", required: false },
  ];

  const existingKeys = new Set(Object.keys(stripInternalFormData(document.form_data || {})));
  const extraFields = Array.from(existingKeys)
    .filter((key) => key && !fields.some((field) => field.name === key))
    .slice(0, 4)
    .map((key) => ({
      name: sanitizeFieldName(key),
      label: toFieldLabel(key),
      type: "textarea" as const,
      required: false,
    }));

  return dedupeFields([...fields, ...extraFields]);
}

function parseCatalogFieldResponse(raw: string) {
  const clean = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const jsonStart = clean.indexOf("{");
  const jsonEnd = clean.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    return [];
  }

  try {
    const parsed = catalogFieldResponseSchema.parse(JSON.parse(clean.slice(jsonStart, jsonEnd + 1)));
    return dedupeFields(parsed.fields.map(normalizeField));
  } catch (error) {
    console.error("catalog_fields_parse_error", error);
    return [];
  }
}

function normalizeField(field: CatalogField): CatalogField {
  return {
    name: sanitizeFieldName(field.name),
    label: field.label.trim(),
    type: field.type,
    required: Boolean(field.required),
    helpText: field.helpText?.trim() || undefined,
  };
}

function dedupeFields(fields: CatalogField[]) {
  const seen = new Set<string>();
  const result: CatalogField[] = [];

  for (const field of fields) {
    const name = sanitizeFieldName(field.name);
    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    result.push({ ...field, name });
  }

  return result.slice(0, 14);
}

function stripInternalFormData(formData: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(formData).filter(([key]) => !key.startsWith("__")));
}

function sanitizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function toFieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
