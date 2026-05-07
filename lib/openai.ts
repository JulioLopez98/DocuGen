import OpenAI from "openai";
import type { DocumentTypeConfig } from "@/lib/document-types";

export const DEFAULT_MODEL = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
export const PREMIUM_MODEL = process.env.OPENAI_MODEL_PREMIUM || "gpt-4.1";

export const documentInstructions =
  "Eres un asistente experto en redaccion de documentos profesionales para Espana. Generas borradores claros, estructurados y adaptados al contexto espanol. No das asesoramiento legal definitivo. Adapta siempre el formato al tipo de documento: solo incluyes clausulas numeradas, partes identificadas o bloque de firmas cuando el documento lo requiera de forma natural. En documentos profesionales no legales, como cartas, actas o propuestas comerciales, usa un estilo humano, claro y no contractual. No inventes datos no proporcionados. Incluye al final un aviso indicando que el documento es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.";

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
  const isFormalLegalDocument = config.includesSignatures || config.category === "Legal" || config.category === "Web";
  const structureRules = isFormalLegalDocument
    ? "Incluye titulo, fecha, partes o titular identificado cuando proceda, apartados claros, clausulas numeradas cuando sea natural para este tipo de documento, aviso final y bloque de firmas solo si se indica abajo."
    : "Incluye titulo, fecha si aporta valor, apartados claros y aviso final. No uses formato contractual, no crees secciones de partes identificadas, no incluyas clausulas y no anadas firmas formales.";

  return `Genera un borrador profesional para Espana.

Tipo de documento: ${config.label}
Categoria: ${config.category}

Reglas de estructura:
${structureRules}

Reglas de calidad:
- Usa lenguaje claro, profesional y adaptado al mercado espanol.
- No inventes datos no proporcionados.
- Si falta informacion, usa [PENDIENTE DE COMPLETAR].
- Evita sonar generico: aprovecha los datos del formulario.
- Mantiene el formato natural del documento, no conviertas cartas, emails, actas o propuestas en contratos.

Instrucciones especificas para este tipo:
${config.generationGuidance}

Firmas:
${config.includesSignatures ? "Incluye un bloque final de firmas porque este documento lo requiere." : "No incluyas bloque de firmas formal."}

Datos proporcionados:
${values}`;
}
