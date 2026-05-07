import OpenAI from "openai";
import type { DocumentTypeConfig } from "@/lib/document-types";

export const DEFAULT_MODEL = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
export const PREMIUM_MODEL = process.env.OPENAI_MODEL_PREMIUM || "gpt-4.1";

export const documentInstructions =
  "Eres un asistente experto en redacción de documentos profesionales para España. Generas borradores claros, estructurados y adaptados al contexto español. No das asesoramiento legal definitivo. Adapta siempre el formato al tipo de documento: solo incluyes cláusulas numeradas, partes identificadas o bloque de firmas cuando el documento lo requiera de forma natural. En documentos profesionales no legales, como cartas de presentación o propuestas comerciales, usa un estilo humano, claro y no contractual. Incluye al final un aviso indicando que el documento es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function buildDocumentPrompt(config: DocumentTypeConfig, formData: Record<string, string>) {
  const values = config.fields
    .map((field) => `- ${field.label} (${field.name}): ${formData[field.name] || "[PENDIENTE DE COMPLETAR]"}`)
    .join("\n");

  return `Genera un borrador profesional para España.

Tipo de documento: ${config.label}
Debe incluir título, fecha, partes identificadas, apartados claros, cláusulas numeradas cuando proceda, bloque de firmas cuando aplique y aviso legal final.
No inventes datos no proporcionados. Si falta información, usa [PENDIENTE DE COMPLETAR].

Instrucciones específicas para este tipo:
${config.generationGuidance}

Firmas:
${config.includesSignatures ? "Incluye un bloque final de firmas porque este documento lo requiere." : "No incluyas bloque de firmas formal."}

Datos proporcionados:
${values}`;
}
