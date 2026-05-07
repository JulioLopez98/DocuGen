import { z } from "zod";

export type DocumentType =
  | "contrato-freelance"
  | "presupuesto-comercial"
  | "propuesta-proyecto"
  | "acuerdo-nda"
  | "aviso-legal"
  | "politica-privacidad"
  | "carta-presentacion"
  | "acuerdo-colaboracion";

export type FieldType = "text" | "email" | "number" | "date" | "textarea";

export type DocumentField = {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
};

export type DocumentTypeConfig = {
  type: DocumentType;
  label: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  category: string;
  fields: DocumentField[];
  includesSignatures: boolean;
  generationGuidance: string;
  future?: boolean;
};

const text = (field: DocumentField) =>
  z.string().trim().min(1, `${field.label} es obligatorio`).max(4000, `${field.label} es demasiado largo`);

export const documentTypes = [
  {
    type: "contrato-freelance",
    label: "Contrato freelance",
    seoTitle: "Generador de contrato freelance en España",
    seoDescription: "Crea un borrador de contrato freelance profesional adaptado al mercado español.",
    summary: "Borrador para prestación de servicios profesionales entre freelancer y cliente.",
    category: "Laboral y servicios",
    includesSignatures: true,
    generationGuidance:
      "Estructura como contrato profesional con partes reunidas, antecedentes si procede, cláusulas numeradas, duración, precio, forma de pago, obligaciones, confidencialidad si procede, jurisdicción y bloque final de firmas.",
    fields: [
      { name: "nombre_freelancer", label: "Nombre del freelancer" },
      { name: "nif_freelancer", label: "NIF del freelancer" },
      { name: "email_freelancer", label: "Email del freelancer", type: "email" },
      { name: "nombre_cliente", label: "Nombre del cliente" },
      { name: "nif_cliente", label: "NIF/CIF del cliente" },
      { name: "descripcion_servicio", label: "Descripción del servicio", type: "textarea" },
      { name: "importe", label: "Importe" },
      { name: "forma_pago", label: "Forma de pago" },
      { name: "duracion", label: "Duración" },
      { name: "fecha_inicio", label: "Fecha de inicio", type: "date" },
    ],
  },
  {
    type: "presupuesto-comercial",
    label: "Presupuesto comercial",
    seoTitle: "Generador de presupuestos comerciales",
    seoDescription: "Redacta presupuestos claros, editables y orientados a clientes en España.",
    summary: "Documento comercial con alcance, partidas, validez y condiciones de pago.",
    category: "Comercial",
    includesSignatures: false,
    generationGuidance:
      "Estructura como presupuesto comercial, no como contrato. Incluye encabezado, cliente, descripción, partidas, importe total, validez, condiciones de pago y aceptación opcional. No incluyas cláusulas legales extensas ni bloque de firmas salvo una línea breve de aceptación.",
    fields: [
      { name: "nombre_empresa", label: "Nombre de la empresa" },
      { name: "cif_empresa", label: "CIF de la empresa" },
      { name: "cliente", label: "Cliente" },
      { name: "descripcion_servicio", label: "Descripción del servicio", type: "textarea" },
      { name: "partidas", label: "Partidas", type: "textarea" },
      { name: "importe_total", label: "Importe total" },
      { name: "validez_presupuesto", label: "Validez del presupuesto" },
      { name: "condiciones_pago", label: "Condiciones de pago", type: "textarea" },
    ],
  },
  {
    type: "propuesta-proyecto",
    label: "Propuesta de proyecto",
    seoTitle: "Generador de propuestas de proyecto",
    seoDescription: "Crea propuestas de proyecto con objetivo, alcance, entregables y condiciones.",
    summary: "Propuesta profesional para presentar alcance, entregables, plazo y precio.",
    category: "Comercial",
    includesSignatures: false,
    generationGuidance:
      "Estructura como propuesta comercial de proyecto. Incluye contexto, objetivo, alcance, entregables, metodología breve, calendario, precio, condiciones y próximos pasos. No uses lenguaje de contrato ni sección de firmas.",
    fields: [
      { name: "nombre_proveedor", label: "Nombre del proveedor" },
      { name: "cliente", label: "Cliente" },
      { name: "objetivo", label: "Objetivo", type: "textarea" },
      { name: "alcance", label: "Alcance", type: "textarea" },
      { name: "entregables", label: "Entregables", type: "textarea" },
      { name: "plazo", label: "Plazo" },
      { name: "precio", label: "Precio" },
      { name: "condiciones", label: "Condiciones", type: "textarea" },
    ],
  },
  {
    type: "acuerdo-nda",
    label: "Acuerdo NDA",
    seoTitle: "Generador de acuerdo de confidencialidad NDA",
    seoDescription: "Prepara un borrador de NDA con objeto, duración y jurisdicción.",
    summary: "Borrador de acuerdo de confidencialidad para compartir información sensible.",
    category: "Legal",
    includesSignatures: true,
    generationGuidance:
      "Estructura como acuerdo de confidencialidad con partes, objeto, obligaciones de confidencialidad, exclusiones, duración, devolución o destrucción de información, jurisdicción y bloque final de firmas.",
    fields: [
      { name: "parte_reveladora", label: "Parte reveladora" },
      { name: "parte_receptora", label: "Parte receptora" },
      { name: "objeto_confidencialidad", label: "Objeto de la confidencialidad", type: "textarea" },
      { name: "duracion", label: "Duración" },
      { name: "jurisdiccion", label: "Jurisdicción" },
    ],
  },
  {
    type: "aviso-legal",
    label: "Aviso legal web",
    seoTitle: "Generador de aviso legal web",
    seoDescription: "Genera un borrador de aviso legal para una web española.",
    summary: "Aviso legal básico para identificar titular, contacto y actividad de una web.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Estructura como aviso legal web. Incluye identificación del titular, objeto, condiciones de uso, propiedad intelectual, responsabilidad, enlaces a privacidad si procede, legislación y jurisdicción. No incluyas bloque de firmas.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "cif_nif", label: "CIF/NIF" },
      { name: "domicilio", label: "Domicilio" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
      { name: "nombre_web", label: "Nombre de la web" },
      { name: "actividad", label: "Actividad", type: "textarea" },
    ],
  },
  {
    type: "politica-privacidad",
    label: "Política de privacidad",
    seoTitle: "Generador de política de privacidad",
    seoDescription: "Crea un borrador de política de privacidad para webs y negocios en España.",
    summary: "Borrador de privacidad con finalidad, base legal y plazo de conservación.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Estructura como política de privacidad web. Incluye responsable, finalidad, base legal, conservación, destinatarios si faltan como [PENDIENTE DE COMPLETAR], derechos de usuarios, seguridad y contacto. No incluyas bloque de firmas.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "cif_nif", label: "CIF/NIF" },
      { name: "domicilio", label: "Domicilio" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
      { name: "nombre_web", label: "Nombre de la web" },
      { name: "finalidad_datos", label: "Finalidad de los datos", type: "textarea" },
      { name: "base_legal", label: "Base legal", type: "textarea" },
      { name: "plazo_conservacion", label: "Plazo de conservación" },
    ],
  },
  {
    type: "carta-presentacion",
    label: "Carta de presentación",
    seoTitle: "Generador de cartas de presentación",
    seoDescription: "Redacta cartas de presentación profesionales para candidaturas en España.",
    summary: "Carta adaptada a puesto, empresa, experiencia y motivación del candidato.",
    category: "Profesional",
    includesSignatures: false,
    generationGuidance:
      "Redacta una carta de presentación natural, humana y profesional, no un documento legal. No incluyas cláusulas, partes identificadas, numeración jurídica ni bloque de firmas. Usa saludo, introducción, experiencia relevante, motivación específica, encaje con la empresa, cierre cordial y firma textual sencilla con nombre y email.",
    fields: [
      { name: "nombre_candidato", label: "Nombre del candidato" },
      { name: "email", label: "Email", type: "email" },
      { name: "puesto", label: "Puesto" },
      { name: "empresa_destino", label: "Empresa destino" },
      { name: "experiencia", label: "Experiencia", type: "textarea" },
      { name: "motivacion", label: "Motivación", type: "textarea" },
    ],
  },
  {
    type: "acuerdo-colaboracion",
    label: "Acuerdo de colaboración",
    seoTitle: "Generador de acuerdos de colaboración",
    seoDescription: "Crea un borrador de acuerdo de colaboración entre partes.",
    summary: "Documento para definir objeto, responsabilidades, duración y condiciones económicas.",
    category: "Empresa",
    includesSignatures: true,
    generationGuidance:
      "Estructura como acuerdo de colaboración con partes, objeto, responsabilidades, duración, condiciones económicas, confidencialidad si procede, resolución, jurisdicción y bloque final de firmas.",
    fields: [
      { name: "parte_1", label: "Parte 1" },
      { name: "parte_2", label: "Parte 2" },
      { name: "objeto_colaboracion", label: "Objeto de la colaboración", type: "textarea" },
      { name: "responsabilidades", label: "Responsabilidades", type: "textarea" },
      { name: "duracion", label: "Duración" },
      { name: "condiciones_economicas", label: "Condiciones económicas", type: "textarea" },
    ],
  },
] as const satisfies readonly DocumentTypeConfig[];

export const futureDocumentTypes = [
  "Contrato de trabajo indefinido",
  "Contrato temporal",
  "Acuerdo de confidencialidad ampliado",
  "Acta de reunión",
  "Contrato de arrendamiento de local",
  "Carta de renuncia / baja voluntaria",
  "Reclamación formal por email",
];

export const documentTypeValues = documentTypes.map((item) => item.type) as [DocumentType, ...DocumentType[]];

export const generatePayloadSchema = z.object({
  docType: z.enum(documentTypeValues),
  formData: z.record(z.string(), z.string().trim().max(4000)),
});

export type GeneratePayload = z.infer<typeof generatePayloadSchema>;

export function getDocumentConfig(type: string | null | undefined) {
  return documentTypes.find((item) => item.type === type);
}

export function buildFormSchema(config: DocumentTypeConfig) {
  return z.object(Object.fromEntries(config.fields.map((field) => [field.name, text(field)])));
}

export function getDefaultDocumentType(value?: string | null): DocumentType {
  return getDocumentConfig(value)?.type || "contrato-freelance";
}
