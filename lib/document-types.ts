import { z } from "zod";

export type DocumentType =
  | "contrato-freelance"
  | "presupuesto-comercial"
  | "propuesta-proyecto"
  | "acuerdo-nda"
  | "aviso-legal"
  | "politica-privacidad"
  | "carta-presentacion"
  | "acuerdo-colaboracion"
  | "contrato-trabajo-indefinido"
  | "contrato-temporal"
  | "acuerdo-confidencialidad-ampliado"
  | "acta-reunion"
  | "arrendamiento-local"
  | "carta-renuncia"
  | "reclamacion-formal-email";

export type FieldType = "text" | "email" | "number" | "date" | "textarea";
export type PlanRequirement = "free" | "pro";

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
  requiredPlan?: PlanRequirement;
  future?: boolean;
};

const text = (field: DocumentField) =>
  z.string().trim().min(1, `${field.label} es obligatorio`).max(4000, `${field.label} es demasiado largo`);

export const documentTypes = [
  {
    type: "contrato-freelance",
    label: "Contrato freelance",
    seoTitle: "Generador de contrato freelance en Espana",
    seoDescription: "Crea un borrador de contrato freelance profesional adaptado al mercado espanol.",
    summary: "Borrador para prestacion de servicios profesionales entre freelancer y cliente.",
    category: "Laboral y servicios",
    includesSignatures: true,
    generationGuidance:
      "Redacta como contrato de prestacion de servicios. Incluye partes, objeto, alcance, precio, forma de pago, duracion, obligaciones, confidencialidad si procede, propiedad intelectual si procede, resolucion, jurisdiccion y firmas. Evita prometer validez legal definitiva.",
    fields: [
      { name: "nombre_freelancer", label: "Nombre del freelancer" },
      { name: "nif_freelancer", label: "NIF del freelancer" },
      { name: "email_freelancer", label: "Email del freelancer", type: "email" },
      { name: "nombre_cliente", label: "Nombre del cliente" },
      { name: "nif_cliente", label: "NIF/CIF del cliente" },
      { name: "descripcion_servicio", label: "Descripcion del servicio", type: "textarea" },
      { name: "importe", label: "Importe" },
      { name: "forma_pago", label: "Forma de pago" },
      { name: "duracion", label: "Duracion" },
      { name: "fecha_inicio", label: "Fecha de inicio", type: "date" },
    ],
  },
  {
    type: "presupuesto-comercial",
    label: "Presupuesto comercial",
    seoTitle: "Generador de presupuestos comerciales",
    seoDescription: "Redacta presupuestos claros, editables y orientados a clientes en Espana.",
    summary: "Documento comercial con alcance, partidas, validez y condiciones de pago.",
    category: "Comercial",
    includesSignatures: false,
    generationGuidance:
      "Redacta como presupuesto comercial, no como contrato. Usa tono claro y orientado a cliente. Incluye resumen del servicio, partidas, importe total, impuestos si no se indica como pendiente, validez, condiciones de pago y aceptacion opcional breve. No incluyas clausulas legales extensas.",
    fields: [
      { name: "nombre_empresa", label: "Nombre de la empresa" },
      { name: "cif_empresa", label: "CIF de la empresa" },
      { name: "cliente", label: "Cliente" },
      { name: "descripcion_servicio", label: "Descripcion del servicio", type: "textarea" },
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
      "Redacta como propuesta comercial de proyecto. Debe sonar profesional y persuasiva, no contractual. Incluye contexto, objetivo, alcance, entregables, metodologia breve, calendario, precio, condiciones, proximos pasos y cierre comercial.",
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
    seoDescription: "Prepara un borrador de NDA con objeto, duracion y jurisdiccion.",
    summary: "Borrador de acuerdo de confidencialidad para compartir informacion sensible.",
    category: "Legal",
    includesSignatures: true,
    generationGuidance:
      "Redacta un NDA sencillo y equilibrado. Incluye partes, definicion de informacion confidencial, objeto, obligaciones, exclusiones, duracion, devolucion o destruccion de informacion, jurisdiccion y firmas.",
    fields: [
      { name: "parte_reveladora", label: "Parte reveladora" },
      { name: "parte_receptora", label: "Parte receptora" },
      { name: "objeto_confidencialidad", label: "Objeto de la confidencialidad", type: "textarea" },
      { name: "duracion", label: "Duracion" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "aviso-legal",
    label: "Aviso legal web",
    seoTitle: "Generador de aviso legal web",
    seoDescription: "Genera un borrador de aviso legal para una web espanola.",
    summary: "Aviso legal basico para identificar titular, contacto y actividad de una web.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta como aviso legal web para Espana. Incluye identificacion del titular, objeto, condiciones de uso, propiedad intelectual, responsabilidad, enlaces a privacidad si procede, legislacion y jurisdiccion. No incluyas firmas.",
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
    label: "Politica de privacidad",
    seoTitle: "Generador de politica de privacidad",
    seoDescription: "Crea un borrador de politica de privacidad para webs y negocios en Espana.",
    summary: "Borrador de privacidad con finalidad, base legal y plazo de conservacion.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta como politica de privacidad web. Incluye responsable, finalidad, base legal, conservacion, destinatarios si faltan como pendiente, derechos de usuarios, seguridad, contacto y autoridad de control. No incluyas firmas.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "cif_nif", label: "CIF/NIF" },
      { name: "domicilio", label: "Domicilio" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
      { name: "nombre_web", label: "Nombre de la web" },
      { name: "finalidad_datos", label: "Finalidad de los datos", type: "textarea" },
      { name: "base_legal", label: "Base legal", type: "textarea" },
      { name: "plazo_conservacion", label: "Plazo de conservacion" },
    ],
  },
  {
    type: "carta-presentacion",
    label: "Carta de presentacion",
    seoTitle: "Generador de cartas de presentacion",
    seoDescription: "Redacta cartas de presentacion profesionales para candidaturas en Espana.",
    summary: "Carta adaptada a puesto, empresa, experiencia y motivacion del candidato.",
    category: "Profesional",
    includesSignatures: false,
    generationGuidance:
      "Redacta una carta natural, humana y profesional. No uses formato legal. No incluyas clausulas, partes identificadas, numeracion juridica ni bloque de firmas. Usa saludo, introduccion, experiencia relevante, motivacion especifica, encaje con la empresa, cierre cordial y firma textual sencilla con nombre y email.",
    fields: [
      { name: "nombre_candidato", label: "Nombre del candidato" },
      { name: "email", label: "Email", type: "email" },
      { name: "puesto", label: "Puesto" },
      { name: "empresa_destino", label: "Empresa destino" },
      { name: "experiencia", label: "Experiencia", type: "textarea" },
      { name: "motivacion", label: "Motivacion", type: "textarea" },
    ],
  },
  {
    type: "acuerdo-colaboracion",
    label: "Acuerdo de colaboracion",
    seoTitle: "Generador de acuerdos de colaboracion",
    seoDescription: "Crea un borrador de acuerdo de colaboracion entre partes.",
    summary: "Documento para definir objeto, responsabilidades, duracion y condiciones economicas.",
    category: "Empresa",
    includesSignatures: true,
    generationGuidance:
      "Redacta como acuerdo de colaboracion con partes, objeto, responsabilidades, duracion, condiciones economicas, confidencialidad si procede, resolucion, jurisdiccion y firmas. Mantiene tono profesional y equilibrado.",
    fields: [
      { name: "parte_1", label: "Parte 1" },
      { name: "parte_2", label: "Parte 2" },
      { name: "objeto_colaboracion", label: "Objeto de la colaboracion", type: "textarea" },
      { name: "responsabilidades", label: "Responsabilidades", type: "textarea" },
      { name: "duracion", label: "Duracion" },
      { name: "condiciones_economicas", label: "Condiciones economicas", type: "textarea" },
    ],
  },
  {
    type: "contrato-trabajo-indefinido",
    label: "Contrato de trabajo indefinido",
    seoTitle: "Generador de contrato de trabajo indefinido",
    seoDescription: "Prepara un borrador de contrato indefinido adaptado al contexto laboral espanol.",
    summary: "Borrador laboral para relacion indefinida entre empresa y trabajador.",
    category: "Laboral",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como borrador laboral para Espana. Incluye empresa, trabajador, puesto, centro de trabajo, jornada, salario, periodo de prueba si se indica, convenio si se indica, vacaciones, confidencialidad si procede, proteccion de datos, ley aplicable y firmas. Recalca que debe revisarse por asesor laboral.",
    fields: [
      { name: "empresa", label: "Empresa" },
      { name: "cif_empresa", label: "CIF de la empresa" },
      { name: "trabajador", label: "Trabajador" },
      { name: "nif_trabajador", label: "NIF del trabajador" },
      { name: "puesto", label: "Puesto" },
      { name: "centro_trabajo", label: "Centro de trabajo" },
      { name: "jornada", label: "Jornada" },
      { name: "salario", label: "Salario" },
      { name: "fecha_inicio", label: "Fecha de inicio", type: "date" },
      { name: "convenio", label: "Convenio aplicable", type: "textarea" },
    ],
  },
  {
    type: "contrato-temporal",
    label: "Contrato temporal",
    seoTitle: "Generador de contrato temporal",
    seoDescription: "Crea un borrador de contrato temporal con causa, duracion y condiciones.",
    summary: "Borrador laboral temporal con causa, fechas, puesto, jornada y salario.",
    category: "Laboral",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como borrador laboral temporal para Espana. Da mucha importancia a la causa temporal, duracion, fechas, puesto, jornada y salario. Usa marcadores pendientes si falta causa o convenio. Incluye advertencia de revision por asesor laboral.",
    fields: [
      { name: "empresa", label: "Empresa" },
      { name: "cif_empresa", label: "CIF de la empresa" },
      { name: "trabajador", label: "Trabajador" },
      { name: "nif_trabajador", label: "NIF del trabajador" },
      { name: "puesto", label: "Puesto" },
      { name: "causa_temporal", label: "Causa temporal", type: "textarea" },
      { name: "fecha_inicio", label: "Fecha de inicio", type: "date" },
      { name: "fecha_fin", label: "Fecha de fin", type: "date" },
      { name: "jornada", label: "Jornada" },
      { name: "salario", label: "Salario" },
    ],
  },
  {
    type: "acuerdo-confidencialidad-ampliado",
    label: "Confidencialidad ampliada",
    seoTitle: "Generador de acuerdo de confidencialidad ampliado",
    seoDescription: "Genera un acuerdo de confidencialidad mas completo para proyectos sensibles.",
    summary: "NDA avanzado con definiciones, exclusiones, medidas, retorno de informacion y penalizaciones si procede.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta un acuerdo de confidencialidad avanzado. Incluye definiciones, alcance, obligaciones, medidas de proteccion, exclusiones, uso permitido, retorno o destruccion, duracion, posibles consecuencias por incumplimiento si se indica, jurisdiccion y firmas.",
    fields: [
      { name: "parte_reveladora", label: "Parte reveladora" },
      { name: "parte_receptora", label: "Parte receptora" },
      { name: "proyecto", label: "Proyecto o relacion" },
      { name: "informacion_confidencial", label: "Informacion confidencial", type: "textarea" },
      { name: "uso_permitido", label: "Uso permitido", type: "textarea" },
      { name: "duracion", label: "Duracion" },
      { name: "penalizaciones", label: "Penalizaciones o consecuencias", type: "textarea" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "acta-reunion",
    label: "Acta de reunion",
    seoTitle: "Generador de actas de reunion",
    seoDescription: "Convierte notas de reunion en un acta clara con acuerdos y tareas.",
    summary: "Acta profesional con asistentes, puntos tratados, acuerdos y responsables.",
    category: "Profesional",
    includesSignatures: false,
    generationGuidance:
      "Redacta como acta de reunion clara y accionable. Incluye fecha, asistentes, agenda, resumen por puntos, acuerdos, tareas con responsables, fechas limite y proximos pasos. No uses lenguaje contractual.",
    fields: [
      { name: "titulo_reunion", label: "Titulo de la reunion" },
      { name: "fecha", label: "Fecha", type: "date" },
      { name: "asistentes", label: "Asistentes", type: "textarea" },
      { name: "agenda", label: "Agenda", type: "textarea" },
      { name: "notas", label: "Notas de la reunion", type: "textarea" },
      { name: "acuerdos", label: "Acuerdos", type: "textarea" },
      { name: "tareas", label: "Tareas y responsables", type: "textarea" },
    ],
  },
  {
    type: "arrendamiento-local",
    label: "Arrendamiento de local",
    seoTitle: "Generador de contrato de arrendamiento de local",
    seoDescription: "Crea un borrador de alquiler de local comercial con condiciones principales.",
    summary: "Borrador para alquiler de local comercial con renta, duracion, fianza y uso.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de arrendamiento de local comercial en Espana. Incluye arrendador, arrendatario, local, uso, renta, fianza, duracion, gastos, obras, conservacion, cesion/subarriendo si procede, resolucion, jurisdiccion y firmas.",
    fields: [
      { name: "arrendador", label: "Arrendador" },
      { name: "nif_arrendador", label: "NIF/CIF arrendador" },
      { name: "arrendatario", label: "Arrendatario" },
      { name: "nif_arrendatario", label: "NIF/CIF arrendatario" },
      { name: "direccion_local", label: "Direccion del local" },
      { name: "uso_local", label: "Uso del local" },
      { name: "renta", label: "Renta" },
      { name: "fianza", label: "Fianza" },
      { name: "duracion", label: "Duracion" },
      { name: "gastos", label: "Gastos y suministros", type: "textarea" },
    ],
  },
  {
    type: "carta-renuncia",
    label: "Carta de renuncia",
    seoTitle: "Generador de carta de renuncia o baja voluntaria",
    seoDescription: "Redacta una carta de baja voluntaria profesional y respetuosa.",
    summary: "Carta breve para comunicar baja voluntaria, fecha efectiva y agradecimiento.",
    category: "Laboral",
    includesSignatures: false,
    generationGuidance:
      "Redacta una carta breve, respetuosa y profesional. No uses clausulas ni lenguaje contractual. Incluye destinatario, comunicacion de baja voluntaria, fecha efectiva, preaviso si se aporta, agradecimiento y cierre con nombre.",
    fields: [
      { name: "nombre_trabajador", label: "Nombre del trabajador" },
      { name: "email", label: "Email", type: "email" },
      { name: "empresa", label: "Empresa" },
      { name: "puesto", label: "Puesto" },
      { name: "fecha_efectiva", label: "Fecha efectiva de baja", type: "date" },
      { name: "preaviso", label: "Preaviso" },
      { name: "mensaje_adicional", label: "Mensaje adicional", type: "textarea" },
    ],
  },
  {
    type: "reclamacion-formal-email",
    label: "Reclamacion formal por email",
    seoTitle: "Generador de reclamaciones formales por email",
    seoDescription: "Prepara un email formal de reclamacion con hechos, solicitud y plazo de respuesta.",
    summary: "Email formal para reclamar una incidencia, servicio, factura o incumplimiento.",
    category: "Profesional",
    includesSignatures: false,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como email formal de reclamacion. Incluye asunto, saludo, exposicion de hechos, referencia si existe, solicitud concreta, plazo razonable de respuesta, documentacion adjunta si procede y cierre profesional. No uses tono agresivo.",
    fields: [
      { name: "remitente", label: "Remitente" },
      { name: "email_remitente", label: "Email remitente", type: "email" },
      { name: "destinatario", label: "Destinatario" },
      { name: "motivo", label: "Motivo de la reclamacion" },
      { name: "hechos", label: "Hechos", type: "textarea" },
      { name: "solicitud", label: "Solicitud concreta", type: "textarea" },
      { name: "plazo_respuesta", label: "Plazo de respuesta" },
      { name: "referencia", label: "Referencia, factura o pedido" },
    ],
  },
] as const satisfies readonly DocumentTypeConfig[];

export const futureDocumentTypes = [
  "Contrato de practicas",
  "Acuerdo de socios",
  "Pacto de no competencia",
  "Condiciones generales de venta",
  "Documento de encargo profesional",
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

export function requiresPro(config: DocumentTypeConfig) {
  return config.requiredPlan === "pro";
}

export function buildFormSchema(config: DocumentTypeConfig) {
  return z.object(Object.fromEntries(config.fields.map((field) => [field.name, text(field)])));
}

export function getDefaultDocumentType(value?: string | null): DocumentType {
  return getDocumentConfig(value)?.type || "contrato-freelance";
}
