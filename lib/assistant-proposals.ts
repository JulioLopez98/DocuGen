import type { ChatMessageRow, DocumentRequestTone } from "@/lib/supabase-server";

export type AssistantDocumentProposal = {
  title: string;
  description: string;
  intendedUse: string;
  tone: DocumentRequestTone;
  sector: string | null;
  adminNotes: string;
};

export function buildAssistantDocumentProposal(messages: ChatMessageRow[]): AssistantDocumentProposal {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter((message) => message.role === "assistant");
  const conversation = messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
  const userText = userMessages.map((message) => message.content).join("\n\n");
  const title = inferProposalTitle(userText);
  const category = inferProposalCategory(userText);
  const tone = inferProposalTone(userText);
  const missingData = inferLikelyMissingData(userText, category);

  return {
    title,
    description: conversation.slice(0, 5000),
    intendedUse: `Propuesta creada desde asistente conversacional. Categoria sugerida: ${category}.`,
    tone,
    sector: category,
    adminNotes: [
      "Origen: asistente conversacional.",
      `Categoria sugerida: ${category}.`,
      `Tono sugerido: ${tone}.`,
      missingData.length > 0 ? `Campos sugeridos: ${missingData.join(", ")}.` : "",
      assistantMessages.length > 0 ? "La conversacion ya contiene guia del asistente y puede convertirse en candidato." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function inferProposalTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/autorizar|autorizacion|autorizaci[oó]n/, "Carta de autorizacion"],
    [/recoger.*document|recogida.*document|certificado/, "Autorizacion para recogida de documentacion"],
    [/reclamaci[oó]n|reclamar|queja/, "Reclamacion formal"],
    [/renuncia|baja voluntaria/, "Carta de baja voluntaria"],
    [/acta|reunion|reuni[oó]n/, "Acta de reunion"],
    [/colaboraci[oó]n|colaborador/, "Acuerdo de colaboracion"],
    [/presupuesto|cotizacion|cotizaci[oó]n/, "Presupuesto comercial"],
    [/propuesta/, "Propuesta profesional"],
    [/contrato.*servicio|prestaci[oó]n.*servicio/, "Contrato de prestacion de servicios"],
    [/confidencialidad|nda/, "Acuerdo de confidencialidad"],
    [/privacidad|datos personales|rgpd/, "Politica de privacidad"],
  ];

  const match = patterns.find(([pattern]) => pattern.test(lower));

  if (match) {
    return match[1];
  }

  if (!normalized) {
    return "Documento a medida";
  }

  const cleaned = normalized.replace(/^(necesito|quiero|me gustaria|busco|hazme|crear)\s+/i, "");
  return cleaned.length > 80 ? `${capitalize(cleaned.slice(0, 77).trim())}...` : capitalize(cleaned);
}

function inferProposalCategory(text: string) {
  const lower = text.toLowerCase();

  if (/(laboral|trabajador|empleado|empresa|rrhh|nomina|despido|baja voluntaria|teletrabajo)/.test(lower)) {
    return "Laboral";
  }

  if (/(web|privacidad|cookies|rgpd|newsletter|ecommerce|tienda online|datos personales)/.test(lower)) {
    return "Web";
  }

  if (/(contrato|acuerdo|nda|confidencialidad|clausula|legal|jurisdiccion|arrendamiento|autorizacion|reclamacion)/.test(lower)) {
    return "Legal";
  }

  if (/(presupuesto|propuesta|cliente|proveedor|venta|compra|comercial|colaborador)/.test(lower)) {
    return "Comercial";
  }

  if (/(carta|email|correo|presentacion|certificado)/.test(lower)) {
    return "Profesional";
  }

  return "A medida";
}

function inferProposalTone(text: string): DocumentRequestTone {
  const lower = text.toLowerCase();

  if (/(email|correo)/.test(lower)) {
    return "email";
  }

  if (/(carta|presentacion|renuncia|baja voluntaria|autorizacion)/.test(lower)) {
    return "carta";
  }

  if (/(laboral|trabajador|empleado|empresa|rrhh)/.test(lower)) {
    return "laboral_prudente";
  }

  if (/(legal|contrato|acuerdo|nda|confidencialidad|reclamacion|jurisdiccion)/.test(lower)) {
    return "legal_prudente";
  }

  if (/(venta|cliente|propuesta|presupuesto|comercial)/.test(lower)) {
    return "comercial";
  }

  return "formal";
}

function inferLikelyMissingData(text: string, category: string) {
  const lower = text.toLowerCase();
  const fields = ["partes implicadas", "fecha", "objetivo del documento"];

  if (category === "Legal" || category === "Comercial") {
    fields.push("condiciones principales", "importe o contraprestacion");
  }

  if (category === "Laboral") {
    fields.push("puesto", "empresa", "trabajador", "fecha efectiva");
  }

  if (category === "Web") {
    fields.push("titular", "web", "contacto", "finalidad");
  }

  if (!/(dni|nif|cif)/.test(lower)) {
    fields.push("DNI/NIF/CIF si aplica");
  }

  return Array.from(new Set(fields)).slice(0, 8);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
