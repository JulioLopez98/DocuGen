import { z } from "zod";
import { defaultTemplateUsageMode, templateUsageModes } from "@/lib/template-usage";

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
  | "reclamacion-formal-email"
  | "factura-proforma"
  | "terminos-condiciones-web"
  | "politica-cookies"
  | "prestacion-servicios-empresa"
  | "acuerdo-socios-basico"
  | "compraventa-sencilla"
  | "carta-reclamacion-empresa"
  | "respuesta-reclamacion"
  | "certificado-prestacion-servicios"
  | "condiciones-generales-venta"
  | "acuerdo-teletrabajo"
  | "pacto-no-competencia"
  | "cesion-derechos-pi"
  | "contrato-desarrollo-web"
  | "contrato-mantenimiento-web"
  | "politica-devoluciones"
  | "politica-envios"
  | "consentimiento-newsletter"
  | "orden-compra"
  | "albaran-entrega"
  | "contrato-arras"
  | "inventario-inmueble"
  | "contrato-formativo-practicas"
  | "hoja-encargo-profesional"
  | "contrato-agencia-comercial"
  | "contrato-distribucion"
  | "memorandum-entendimiento"
  | "acta-junta-socios"
  | "autorizacion-representacion"
  | "carta-autorizacion-recogida"
  | "requerimiento-pago"
  | "reconocimiento-deuda"
  | "recibo-pago"
  | "informe-incidencia"
  | "encargo-tratamiento-datos";

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
    seoTitle: "Generador de contrato freelance en España",
    seoDescription: "Crea un borrador de contrato freelance profesional adaptado al mercado español.",
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
    seoDescription: "Redacta presupuestos claros, editables y orientados a clientes en España.",
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
    seoDescription: "Genera un borrador de aviso legal para una web española.",
    summary: "Aviso legal basico para identificar titular, contacto y actividad de una web.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta como aviso legal web para España. Incluye identificacion del titular, objeto, condiciones de uso, propiedad intelectual, responsabilidad, enlaces a privacidad si procede, legislacion y jurisdiccion. No incluyas firmas.",
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
    seoDescription: "Crea un borrador de politica de privacidad para webs y negocios en España.",
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
    seoDescription: "Redacta cartas de presentacion profesionales para candidaturas en España.",
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
    seoDescription: "Prepara un borrador de contrato indefinido adaptado al contexto laboral español.",
    summary: "Borrador laboral para relacion indefinida entre empresa y trabajador.",
    category: "Laboral",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como borrador laboral para España. Incluye empresa, trabajador, puesto, centro de trabajo, jornada, salario, periodo de prueba si se indica, convenio si se indica, vacaciones, confidencialidad si procede, proteccion de datos, ley aplicable y firmas. Recalca que debe revisarse por asesor laboral.",
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
      "Redacta como borrador laboral temporal para España. Da mucha importancia a la causa temporal, duracion, fechas, puesto, jornada y salario. Usa marcadores pendientes si falta causa o convenio. Incluye advertencia de revision por asesor laboral.",
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
      "Redacta como contrato de arrendamiento de local comercial en España. Incluye arrendador, arrendatario, local, uso, renta, fianza, duracion, gastos, obras, conservacion, cesion/subarriendo si procede, resolucion, jurisdiccion y firmas.",
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
  {
    type: "factura-proforma",
    label: "Factura proforma",
    seoTitle: "Generador de factura proforma",
    seoDescription: "Prepara una factura proforma clara con cliente, conceptos e importes.",
    summary: "Documento comercial previo con datos de emisor, cliente, conceptos, impuestos y total.",
    category: "Comercial",
    includesSignatures: false,
    generationGuidance:
      "Redacta como factura proforma, no como factura definitiva. Incluye emisor, cliente, numero o referencia si falta como pendiente, fecha, conceptos, base imponible, impuestos si se aportan, total, forma de pago, validez y aviso de que no tiene valor fiscal definitivo salvo revision.",
    fields: [
      { name: "emisor", label: "Emisor" },
      { name: "cif_emisor", label: "CIF/NIF emisor" },
      { name: "cliente", label: "Cliente" },
      { name: "cif_cliente", label: "CIF/NIF cliente" },
      { name: "conceptos", label: "Conceptos", type: "textarea" },
      { name: "base_imponible", label: "Base imponible" },
      { name: "impuestos", label: "Impuestos" },
      { name: "total", label: "Total" },
      { name: "forma_pago", label: "Forma de pago" },
      { name: "validez", label: "Validez" },
    ],
  },
  {
    type: "terminos-condiciones-web",
    label: "Terminos y condiciones web",
    seoTitle: "Generador de terminos y condiciones web",
    seoDescription: "Crea un borrador de terminos y condiciones para una web o servicio digital.",
    summary: "Condiciones de uso para webs, servicios digitales, SaaS o venta online.",
    category: "Web",
    includesSignatures: false,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta terminos y condiciones web. Incluye titular, objeto, acceso, registro si aplica, condiciones de compra o uso, precios si procede, obligaciones de usuarios, propiedad intelectual, responsabilidad, cancelacion, legislacion y contacto. No incluyas firmas.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "cif_nif", label: "CIF/NIF" },
      { name: "nombre_web", label: "Nombre de la web" },
      { name: "actividad", label: "Actividad o servicio", type: "textarea" },
      { name: "usuarios", label: "Tipo de usuarios" },
      { name: "condiciones_compra", label: "Condiciones de compra o uso", type: "textarea" },
      { name: "cancelaciones", label: "Cancelaciones o bajas", type: "textarea" },
      { name: "contacto", label: "Email de contacto", type: "email" },
    ],
  },
  {
    type: "politica-cookies",
    label: "Politica de cookies",
    seoTitle: "Generador de politica de cookies",
    seoDescription: "Prepara una politica de cookies para una web española.",
    summary: "Borrador web con tipos de cookies, finalidad, titular y gestion del consentimiento.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta una politica de cookies para España. Incluye titular, que son las cookies, tipos usados, finalidades, terceros si se indican, gestion del consentimiento, revocacion y contacto. Usa pendientes si no hay detalle tecnico.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "nombre_web", label: "Nombre de la web" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
      { name: "cookies_utilizadas", label: "Cookies utilizadas", type: "textarea" },
      { name: "terceros", label: "Terceros o herramientas", type: "textarea" },
      { name: "finalidad", label: "Finalidad", type: "textarea" },
    ],
  },
  {
    type: "prestacion-servicios-empresa",
    label: "Prestacion de servicios empresa",
    seoTitle: "Generador de contrato de prestacion de servicios empresa",
    seoDescription: "Crea un borrador de contrato de servicios entre empresas.",
    summary: "Contrato B2B para definir alcance, precio, obligaciones, plazos y responsabilidad.",
    category: "Empresa",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato B2B de prestacion de servicios. Incluye partes, objeto, alcance, entregables, precio, facturacion, plazos, obligaciones, propiedad intelectual, confidencialidad, responsabilidad, terminacion, jurisdiccion y firmas.",
    fields: [
      { name: "proveedor", label: "Empresa proveedora" },
      { name: "cif_proveedor", label: "CIF proveedor" },
      { name: "cliente", label: "Empresa cliente" },
      { name: "cif_cliente", label: "CIF cliente" },
      { name: "servicios", label: "Servicios", type: "textarea" },
      { name: "entregables", label: "Entregables", type: "textarea" },
      { name: "precio", label: "Precio" },
      { name: "facturacion", label: "Facturacion y pagos", type: "textarea" },
      { name: "plazo", label: "Plazo" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "acuerdo-socios-basico",
    label: "Acuerdo de socios basico",
    seoTitle: "Generador de acuerdo de socios basico",
    seoDescription: "Prepara un borrador de pacto entre socios para proyectos o sociedades.",
    summary: "Documento para regular aportaciones, participaciones, decisiones, salidas y obligaciones.",
    category: "Empresa",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como acuerdo de socios basico. Incluye socios, proyecto o sociedad, aportaciones, participaciones, organos de decision, mayorias, dedicacion, confidencialidad, no competencia si se indica, transmision de participaciones, salida, resolucion de conflictos y firmas.",
    fields: [
      { name: "socios", label: "Socios", type: "textarea" },
      { name: "proyecto_sociedad", label: "Proyecto o sociedad" },
      { name: "aportaciones", label: "Aportaciones", type: "textarea" },
      { name: "participaciones", label: "Participaciones" },
      { name: "decisiones", label: "Toma de decisiones", type: "textarea" },
      { name: "dedicacion", label: "Dedicacion y funciones", type: "textarea" },
      { name: "salida_socios", label: "Salida de socios", type: "textarea" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "compraventa-sencilla",
    label: "Contrato de compraventa sencillo",
    seoTitle: "Generador de contrato de compraventa sencillo",
    seoDescription: "Crea un borrador de compraventa de bienes con precio, entrega y estado.",
    summary: "Contrato para compraventa de bienes, equipos o material entre particulares o empresas.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de compraventa sencillo. Incluye vendedor, comprador, descripcion del bien, estado, precio, forma de pago, entrega, manifestaciones, responsabilidad, jurisdiccion y firmas.",
    fields: [
      { name: "vendedor", label: "Vendedor" },
      { name: "nif_vendedor", label: "NIF/CIF vendedor" },
      { name: "comprador", label: "Comprador" },
      { name: "nif_comprador", label: "NIF/CIF comprador" },
      { name: "bien", label: "Bien objeto de compraventa", type: "textarea" },
      { name: "estado", label: "Estado del bien", type: "textarea" },
      { name: "precio", label: "Precio" },
      { name: "forma_pago", label: "Forma de pago" },
      { name: "entrega", label: "Entrega" },
    ],
  },
  {
    type: "carta-reclamacion-empresa",
    label: "Carta de reclamacion",
    seoTitle: "Generador de carta de reclamacion",
    seoDescription: "Redacta una carta formal de reclamacion a empresa o proveedor.",
    summary: "Carta formal para exponer hechos, solicitar solucion y dejar constancia.",
    category: "Profesional",
    includesSignatures: false,
    generationGuidance:
      "Redacta una carta formal de reclamacion, con tono firme y educado. Incluye remitente, destinatario, hechos, referencia, solicitud concreta, plazo de respuesta y cierre. No uses lenguaje agresivo ni amenazas no justificadas.",
    fields: [
      { name: "remitente", label: "Remitente" },
      { name: "destinatario", label: "Destinatario" },
      { name: "referencia", label: "Referencia" },
      { name: "hechos", label: "Hechos", type: "textarea" },
      { name: "solicitud", label: "Solicitud", type: "textarea" },
      { name: "plazo_respuesta", label: "Plazo de respuesta" },
      { name: "contacto", label: "Contacto" },
    ],
  },
  {
    type: "respuesta-reclamacion",
    label: "Respuesta a reclamacion",
    seoTitle: "Generador de respuesta formal a reclamacion",
    seoDescription: "Prepara una respuesta profesional a una reclamacion de cliente o usuario.",
    summary: "Respuesta empresarial para aceptar, matizar o rechazar una reclamacion con tono profesional.",
    category: "Empresa",
    includesSignatures: false,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como respuesta formal a una reclamacion. Incluye acuse de recibo, resumen de la reclamacion, posicion de la empresa, solucion o explicacion, plazos, canal de contacto y cierre profesional. Mantiene tono empatico y prudente.",
    fields: [
      { name: "empresa", label: "Empresa" },
      { name: "cliente", label: "Cliente" },
      { name: "referencia", label: "Referencia" },
      { name: "reclamacion_recibida", label: "Reclamacion recibida", type: "textarea" },
      { name: "posicion_empresa", label: "Posicion de la empresa", type: "textarea" },
      { name: "solucion", label: "Solucion propuesta", type: "textarea" },
      { name: "contacto", label: "Contacto" },
    ],
  },
  {
    type: "certificado-prestacion-servicios",
    label: "Certificado de servicios",
    seoTitle: "Generador de certificado de prestacion de servicios",
    seoDescription: "Crea un certificado profesional de servicios prestados.",
    summary: "Certificado breve para acreditar servicios, fechas, cliente y proveedor.",
    category: "Profesional",
    includesSignatures: true,
    generationGuidance:
      "Redacta como certificado profesional breve. Incluye entidad o persona emisora, persona o empresa certificada, descripcion del servicio, periodo, valoracion si se indica, fecha y firma sencilla.",
    fields: [
      { name: "emisor", label: "Emisor del certificado" },
      { name: "certificado_a", label: "Persona o empresa certificada" },
      { name: "servicio", label: "Servicio prestado", type: "textarea" },
      { name: "periodo", label: "Periodo" },
      { name: "valoracion", label: "Valoracion o comentario", type: "textarea" },
      { name: "fecha", label: "Fecha", type: "date" },
    ],
  },
  {
    type: "condiciones-generales-venta",
    label: "Condiciones generales de venta",
    seoTitle: "Generador de condiciones generales de venta",
    seoDescription: "Prepara condiciones de venta para ecommerce o servicios comerciales.",
    summary: "Condiciones para pedidos, pagos, envios, devoluciones, garantias y atencion al cliente.",
    category: "Comercial",
    includesSignatures: false,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta condiciones generales de venta. Incluye vendedor, productos o servicios, proceso de compra, precios, pagos, envios, desistimiento o devoluciones si aplica, garantias, atencion al cliente, responsabilidad, legislacion y contacto.",
    fields: [
      { name: "vendedor", label: "Vendedor" },
      { name: "cif_nif", label: "CIF/NIF" },
      { name: "productos_servicios", label: "Productos o servicios", type: "textarea" },
      { name: "proceso_compra", label: "Proceso de compra", type: "textarea" },
      { name: "pagos", label: "Pagos", type: "textarea" },
      { name: "envios", label: "Envios o entrega", type: "textarea" },
      { name: "devoluciones", label: "Devoluciones o desistimiento", type: "textarea" },
      { name: "contacto", label: "Contacto", type: "email" },
    ],
  },
  {
    type: "acuerdo-teletrabajo",
    label: "Acuerdo de teletrabajo",
    seoTitle: "Generador de acuerdo de teletrabajo",
    seoDescription: "Prepara un borrador de acuerdo de teletrabajo para empresa y trabajador.",
    summary: "Acuerdo laboral con jornada, medios, gastos, lugar de trabajo y disponibilidad.",
    category: "Laboral",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como acuerdo de teletrabajo para España. Incluye empresa, trabajador, modalidad, lugar, jornada, disponibilidad, medios aportados, gastos, prevencion de riesgos, proteccion de datos, duracion, reversibilidad y firmas. Recomienda revision laboral.",
    fields: [
      { name: "empresa", label: "Empresa" },
      { name: "trabajador", label: "Trabajador" },
      { name: "puesto", label: "Puesto" },
      { name: "modalidad", label: "Modalidad de teletrabajo" },
      { name: "lugar_trabajo", label: "Lugar de teletrabajo" },
      { name: "jornada", label: "Jornada y horario" },
      { name: "medios", label: "Medios y equipos", type: "textarea" },
      { name: "gastos", label: "Gastos y compensacion", type: "textarea" },
      { name: "duracion", label: "Duracion" },
    ],
  },
  {
    type: "pacto-no-competencia",
    label: "Pacto de no competencia",
    seoTitle: "Generador de pacto de no competencia",
    seoDescription: "Crea un borrador de pacto de no competencia o no captacion.",
    summary: "Pacto para regular limites de competencia, clientes, duracion y compensacion.",
    category: "Empresa",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como pacto de no competencia o no captacion. Incluye partes, ambito, actividades restringidas, territorio, duracion, compensacion si procede, confidencialidad, consecuencias por incumplimiento, proporcionalidad y firmas. Evita asegurar validez automatica.",
    fields: [
      { name: "parte_obligada", label: "Parte obligada" },
      { name: "parte_beneficiaria", label: "Parte beneficiaria" },
      { name: "actividad_restringida", label: "Actividad restringida", type: "textarea" },
      { name: "territorio", label: "Territorio" },
      { name: "duracion", label: "Duracion" },
      { name: "compensacion", label: "Compensacion", type: "textarea" },
      { name: "clientes_o_sector", label: "Clientes o sector afectados", type: "textarea" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "cesion-derechos-pi",
    label: "Cesion de derechos PI",
    seoTitle: "Generador de cesion de derechos de propiedad intelectual",
    seoDescription: "Prepara una cesion de derechos de propiedad intelectual para obras o proyectos.",
    summary: "Documento para ceder derechos de uso, explotacion o propiedad intelectual sobre una obra.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como cesion de derechos de propiedad intelectual. Incluye cedente, cesionario, obra, derechos cedidos, ambito territorial, duracion, exclusividad, precio o contraprestacion, garantias, creditos/autoria si procede y firmas.",
    fields: [
      { name: "cedente", label: "Cedente" },
      { name: "cesionario", label: "Cesionario" },
      { name: "obra", label: "Obra o activo", type: "textarea" },
      { name: "derechos_cedidos", label: "Derechos cedidos", type: "textarea" },
      { name: "exclusividad", label: "Exclusividad" },
      { name: "territorio", label: "Territorio" },
      { name: "duracion", label: "Duracion" },
      { name: "contraprestacion", label: "Precio o contraprestacion" },
    ],
  },
  {
    type: "contrato-desarrollo-web",
    label: "Contrato de desarrollo web",
    seoTitle: "Generador de contrato de desarrollo web",
    seoDescription: "Crea un borrador para contratar desarrollo web, alcance, entregables y pagos.",
    summary: "Contrato digital para webs, apps sencillas, entregables, hitos, revisiones y propiedad.",
    category: "Digital",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de desarrollo web. Incluye proveedor, cliente, alcance, funcionalidades, entregables, calendario, revisiones, precio, pagos por hitos, aceptacion, mantenimiento si procede, propiedad intelectual, contenidos del cliente, confidencialidad y firmas.",
    fields: [
      { name: "proveedor", label: "Proveedor" },
      { name: "cliente", label: "Cliente" },
      { name: "proyecto", label: "Proyecto web" },
      { name: "alcance", label: "Alcance y funcionalidades", type: "textarea" },
      { name: "entregables", label: "Entregables", type: "textarea" },
      { name: "plazo", label: "Plazo" },
      { name: "precio", label: "Precio" },
      { name: "revisiones", label: "Revisiones incluidas" },
      { name: "propiedad", label: "Propiedad intelectual", type: "textarea" },
    ],
  },
  {
    type: "contrato-mantenimiento-web",
    label: "Mantenimiento web",
    seoTitle: "Generador de contrato de mantenimiento web",
    seoDescription: "Prepara un contrato de mantenimiento web con alcance, SLA y pagos.",
    summary: "Contrato para soporte, actualizaciones, seguridad, tiempos de respuesta y cuotas.",
    category: "Digital",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de mantenimiento web. Incluye partes, web o servicio, alcance, exclusiones, tiempos de respuesta, horarios, cuota, incidencias, copias de seguridad si procede, seguridad, duracion, terminacion y firmas.",
    fields: [
      { name: "proveedor", label: "Proveedor" },
      { name: "cliente", label: "Cliente" },
      { name: "web_servicio", label: "Web o servicio" },
      { name: "alcance", label: "Alcance del mantenimiento", type: "textarea" },
      { name: "exclusiones", label: "Exclusiones", type: "textarea" },
      { name: "tiempos_respuesta", label: "Tiempos de respuesta" },
      { name: "cuota", label: "Cuota" },
      { name: "duracion", label: "Duracion" },
    ],
  },
  {
    type: "politica-devoluciones",
    label: "Politica de devoluciones",
    seoTitle: "Generador de politica de devoluciones",
    seoDescription: "Crea una politica de devoluciones para ecommerce o negocio online.",
    summary: "Documento web para cambios, devoluciones, plazos, costes y excepciones.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta politica de devoluciones clara para ecommerce. Incluye plazo, estado del producto, procedimiento, costes, reembolsos, excepciones, productos excluidos si se indican, contacto y aviso de revision.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "nombre_tienda", label: "Nombre de tienda/web" },
      { name: "plazo_devolucion", label: "Plazo de devolucion" },
      { name: "condiciones_producto", label: "Condiciones del producto", type: "textarea" },
      { name: "costes", label: "Costes de devolucion" },
      { name: "excepciones", label: "Excepciones", type: "textarea" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
    ],
  },
  {
    type: "politica-envios",
    label: "Politica de envios",
    seoTitle: "Generador de politica de envios",
    seoDescription: "Prepara una politica de envios para ecommerce con plazos y costes.",
    summary: "Documento web con zonas, plazos, costes, incidencias y seguimiento de envios.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta politica de envios para ecommerce. Incluye zonas de envio, plazos, costes, transportistas si se indican, seguimiento, incidencias, direccion incorrecta, pedidos internacionales si aplica y contacto.",
    fields: [
      { name: "titular", label: "Titular" },
      { name: "nombre_tienda", label: "Nombre de tienda/web" },
      { name: "zonas_envio", label: "Zonas de envio", type: "textarea" },
      { name: "plazos", label: "Plazos de entrega" },
      { name: "costes", label: "Costes de envio" },
      { name: "transportistas", label: "Transportistas" },
      { name: "incidencias", label: "Gestion de incidencias", type: "textarea" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
    ],
  },
  {
    type: "consentimiento-newsletter",
    label: "Consentimiento newsletter",
    seoTitle: "Generador de consentimiento para newsletter",
    seoDescription: "Crea un texto de consentimiento para suscripciones a newsletter.",
    summary: "Texto informativo para captacion de emails, finalidad, responsable y derechos.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta un texto de consentimiento para newsletter. Incluye responsable, finalidad, base de consentimiento, frecuencia si se indica, baja, derechos de usuario, enlace a privacidad si falta como pendiente y contacto.",
    fields: [
      { name: "responsable", label: "Responsable" },
      { name: "nombre_newsletter", label: "Nombre de la newsletter" },
      { name: "finalidad", label: "Finalidad", type: "textarea" },
      { name: "frecuencia", label: "Frecuencia" },
      { name: "politica_privacidad_url", label: "URL politica de privacidad" },
      { name: "email_contacto", label: "Email de contacto", type: "email" },
    ],
  },
  {
    type: "orden-compra",
    label: "Orden de compra",
    seoTitle: "Generador de orden de compra",
    seoDescription: "Prepara una orden de compra con proveedor, conceptos, cantidades y condiciones.",
    summary: "Documento comercial para formalizar una solicitud de compra a proveedor.",
    category: "Comercial",
    includesSignatures: false,
    generationGuidance:
      "Redacta como orden de compra. Incluye comprador, proveedor, referencia, fecha, productos o servicios, cantidades, precios, total, entrega, condiciones de pago y contacto. No la conviertas en contrato extenso.",
    fields: [
      { name: "comprador", label: "Comprador" },
      { name: "proveedor", label: "Proveedor" },
      { name: "referencia", label: "Referencia" },
      { name: "conceptos", label: "Conceptos", type: "textarea" },
      { name: "importe_total", label: "Importe total" },
      { name: "fecha_entrega", label: "Fecha de entrega" },
      { name: "condiciones_pago", label: "Condiciones de pago", type: "textarea" },
    ],
  },
  {
    type: "albaran-entrega",
    label: "Albaran de entrega",
    seoTitle: "Generador de albaran de entrega",
    seoDescription: "Crea un albaran de entrega con productos, receptor y observaciones.",
    summary: "Documento de entrega para acreditar recepcion de productos o materiales.",
    category: "Comercial",
    includesSignatures: true,
    generationGuidance:
      "Redacta como albaran de entrega. Incluye emisor, receptor, fecha, referencia, productos o materiales, cantidades, estado, observaciones, firma de entrega y recepcion. No incluyas clausulas legales extensas.",
    fields: [
      { name: "emisor", label: "Emisor" },
      { name: "receptor", label: "Receptor" },
      { name: "referencia", label: "Referencia" },
      { name: "productos", label: "Productos o materiales", type: "textarea" },
      { name: "fecha_entrega", label: "Fecha de entrega", type: "date" },
      { name: "lugar_entrega", label: "Lugar de entrega" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
  },
  {
    type: "contrato-arras",
    label: "Contrato de arras",
    seoTitle: "Generador de contrato de arras",
    seoDescription: "Prepara un borrador de contrato de arras para compraventa inmobiliaria.",
    summary: "Documento inmobiliario con comprador, vendedor, inmueble, precio, senal y plazo.",
    category: "Inmobiliario",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de arras. Incluye vendedor, comprador, inmueble, precio total, cantidad entregada, tipo de arras si se indica, plazo para escritura, cargas si se aportan, gastos, consecuencias de incumplimiento, jurisdiccion y firmas. Recomienda revision profesional.",
    fields: [
      { name: "vendedor", label: "Vendedor" },
      { name: "comprador", label: "Comprador" },
      { name: "inmueble", label: "Inmueble", type: "textarea" },
      { name: "precio_total", label: "Precio total" },
      { name: "cantidad_arras", label: "Cantidad entregada como arras" },
      { name: "tipo_arras", label: "Tipo de arras" },
      { name: "plazo_escritura", label: "Plazo para escritura" },
      { name: "jurisdiccion", label: "Jurisdiccion" },
    ],
  },
  {
    type: "inventario-inmueble",
    label: "Inventario de inmueble",
    seoTitle: "Generador de inventario de inmueble",
    seoDescription: "Crea un inventario de local o vivienda para alquiler o entrega.",
    summary: "Inventario de estado, mobiliario, llaves, suministros y observaciones.",
    category: "Inmobiliario",
    includesSignatures: true,
    generationGuidance:
      "Redacta como inventario anexo de inmueble. Incluye inmueble, fecha, partes, estancias, mobiliario, electrodomesticos, estado general, llaves, contadores, observaciones, fotografias si faltan como pendiente y firmas.",
    fields: [
      { name: "inmueble", label: "Inmueble" },
      { name: "propietario", label: "Propietario o arrendador" },
      { name: "ocupante", label: "Inquilino o receptor" },
      { name: "fecha", label: "Fecha", type: "date" },
      { name: "estancias", label: "Estancias y estado", type: "textarea" },
      { name: "mobiliario", label: "Mobiliario y equipamiento", type: "textarea" },
      { name: "llaves", label: "Llaves entregadas" },
      { name: "observaciones", label: "Observaciones", type: "textarea" },
    ],
  },
  {
    type: "contrato-formativo-practicas",
    label: "Contrato formativo/prácticas",
    seoTitle: "Generador de contrato formativo o prácticas",
    seoDescription: "Prepara un borrador prudente de contrato formativo o de prácticas para España.",
    summary: "Borrador laboral para prácticas, formación, tutor, duración, jornada y retribución.",
    category: "Laboral",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como borrador laboral formativo o de prácticas para España. Incluye empresa, persona trabajadora o estudiante, centro formativo si procede, tutor, puesto, plan formativo, duración, jornada, retribución o ayuda si se aporta, convenio o normativa aplicable como pendiente si falta, protección de datos y firmas. Recomienda revisión laboral/académica.",
    fields: [
      { name: "empresa", label: "Empresa" },
      { name: "cif_empresa", label: "CIF de la empresa" },
      { name: "persona", label: "Persona en prácticas/formación" },
      { name: "nif_persona", label: "NIF de la persona" },
      { name: "centro_formativo", label: "Centro formativo" },
      { name: "puesto", label: "Puesto o área" },
      { name: "plan_formativo", label: "Plan formativo", type: "textarea" },
      { name: "tutor", label: "Tutor o responsable" },
      { name: "duracion", label: "Duración" },
      { name: "jornada", label: "Jornada" },
      { name: "retribucion", label: "Retribución o ayuda" },
    ],
  },
  {
    type: "hoja-encargo-profesional",
    label: "Hoja de encargo profesional",
    seoTitle: "Generador de hoja de encargo profesional",
    seoDescription: "Crea una hoja de encargo con alcance, honorarios, plazos y responsabilidades.",
    summary: "Documento para formalizar un encargo profesional con cliente, servicios, honorarios y condiciones.",
    category: "Laboral y servicios",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como hoja de encargo profesional. Incluye profesional o despacho, cliente, objeto del encargo, alcance incluido y excluido, honorarios, provisiones si procede, plazos, obligaciones de información del cliente, confidencialidad, protección de datos, resolución y firmas. Mantén tono claro y prudente.",
    fields: [
      { name: "profesional", label: "Profesional o despacho" },
      { name: "nif_profesional", label: "NIF/CIF profesional" },
      { name: "cliente", label: "Cliente" },
      { name: "nif_cliente", label: "NIF/CIF cliente" },
      { name: "objeto_encargo", label: "Objeto del encargo", type: "textarea" },
      { name: "alcance", label: "Alcance incluido", type: "textarea" },
      { name: "exclusiones", label: "Exclusiones", type: "textarea" },
      { name: "honorarios", label: "Honorarios" },
      { name: "plazos", label: "Plazos" },
      { name: "condiciones", label: "Condiciones adicionales", type: "textarea" },
    ],
  },
  {
    type: "contrato-agencia-comercial",
    label: "Contrato de agencia comercial",
    seoTitle: "Generador de contrato de agencia comercial",
    seoDescription: "Prepara un borrador B2B de agencia comercial con territorio, comisiones y exclusividad.",
    summary: "Acuerdo comercial para agente, principal, territorio, objetivos, comisiones y duración.",
    category: "Comercial",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de agencia comercial B2B. Incluye principal, agente, productos o servicios, territorio, exclusividad si se aporta, obligaciones, objetivos, comisiones, liquidación, duración, confidencialidad, no captación si procede, terminación y firmas. Recomienda revisión profesional por impacto mercantil.",
    fields: [
      { name: "principal", label: "Empresa principal" },
      { name: "agente", label: "Agente comercial" },
      { name: "productos_servicios", label: "Productos o servicios", type: "textarea" },
      { name: "territorio", label: "Territorio" },
      { name: "exclusividad", label: "Exclusividad" },
      { name: "comisiones", label: "Comisiones", type: "textarea" },
      { name: "objetivos", label: "Objetivos comerciales", type: "textarea" },
      { name: "duracion", label: "Duración" },
      { name: "terminacion", label: "Terminación", type: "textarea" },
    ],
  },
  {
    type: "contrato-distribucion",
    label: "Contrato de distribución",
    seoTitle: "Generador de contrato de distribución",
    seoDescription: "Crea un borrador de distribución comercial con territorio, productos y condiciones.",
    summary: "Contrato B2B para fabricante/proveedor y distribuidor con zona, precios, pedidos y obligaciones.",
    category: "Comercial",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como contrato de distribución B2B. Incluye proveedor, distribuidor, productos, territorio, exclusividad si procede, pedidos, precios, condiciones de pago, entregas, obligaciones comerciales, marca, confidencialidad, duración, terminación y firmas. No inventes mínimos ni exclusividades.",
    fields: [
      { name: "proveedor", label: "Proveedor o fabricante" },
      { name: "distribuidor", label: "Distribuidor" },
      { name: "productos", label: "Productos", type: "textarea" },
      { name: "territorio", label: "Territorio" },
      { name: "exclusividad", label: "Exclusividad" },
      { name: "precios", label: "Precios o márgenes", type: "textarea" },
      { name: "pedidos_entregas", label: "Pedidos y entregas", type: "textarea" },
      { name: "duracion", label: "Duración" },
      { name: "condiciones_pago", label: "Condiciones de pago", type: "textarea" },
    ],
  },
  {
    type: "memorandum-entendimiento",
    label: "Memorándum de entendimiento",
    seoTitle: "Generador de memorándum de entendimiento",
    seoDescription: "Redacta un MoU o memorándum de entendimiento para colaboración inicial.",
    summary: "Documento preliminar para alinear intención, objetivos, aportaciones y próximos pasos.",
    category: "Empresa",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como memorándum de entendimiento no definitivo salvo que el usuario indique lo contrario. Incluye partes, contexto, objetivos, áreas de colaboración, aportaciones, calendario, confidencialidad si procede, naturaleza no vinculante o vinculante parcial como pendiente, próximos pasos y firmas.",
    fields: [
      { name: "parte_1", label: "Parte 1" },
      { name: "parte_2", label: "Parte 2" },
      { name: "contexto", label: "Contexto", type: "textarea" },
      { name: "objetivos", label: "Objetivos", type: "textarea" },
      { name: "aportaciones", label: "Aportaciones de cada parte", type: "textarea" },
      { name: "calendario", label: "Calendario o hitos" },
      { name: "naturaleza", label: "Naturaleza vinculante/no vinculante" },
      { name: "proximos_pasos", label: "Próximos pasos", type: "textarea" },
    ],
  },
  {
    type: "acta-junta-socios",
    label: "Acta de junta de socios",
    seoTitle: "Generador de acta de junta de socios",
    seoDescription: "Prepara un borrador de acta de junta con asistentes, acuerdos y votaciones.",
    summary: "Acta societaria para reuniones de socios, acuerdos, votaciones y certificación interna.",
    category: "Empresa",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como borrador de acta de junta de socios o reunión societaria. Incluye sociedad, convocatoria si se aporta, fecha, lugar, asistentes, quórum como pendiente si falta, orden del día, deliberaciones, acuerdos, votaciones, cierre y firmas. No inventes porcentajes ni mayorías.",
    fields: [
      { name: "sociedad", label: "Sociedad" },
      { name: "cif", label: "CIF" },
      { name: "fecha", label: "Fecha", type: "date" },
      { name: "lugar", label: "Lugar" },
      { name: "asistentes", label: "Socios/asistentes", type: "textarea" },
      { name: "orden_dia", label: "Orden del día", type: "textarea" },
      { name: "acuerdos", label: "Acuerdos adoptados", type: "textarea" },
      { name: "votaciones", label: "Votaciones o mayorías", type: "textarea" },
      { name: "firmantes", label: "Firmantes" },
    ],
  },
  {
    type: "autorizacion-representacion",
    label: "Autorización de representación",
    seoTitle: "Generador de autorización de representación",
    seoDescription: "Crea una autorización sencilla para que una persona actúe en nombre de otra.",
    summary: "Autorización formal para trámites concretos, representante, representado y alcance.",
    category: "Profesional",
    includesSignatures: true,
    generationGuidance:
      "Redacta como autorización sencilla de representación para un trámite concreto. Incluye autorizante, autorizado, documento identificativo, entidad o trámite, alcance limitado, fecha, lugar, advertencia de uso limitado y firmas. No la conviertas en poder notarial.",
    fields: [
      { name: "autorizante", label: "Autorizante" },
      { name: "dni_autorizante", label: "DNI/NIF autorizante" },
      { name: "autorizado", label: "Autorizado" },
      { name: "dni_autorizado", label: "DNI/NIF autorizado" },
      { name: "tramite", label: "Trámite autorizado", type: "textarea" },
      { name: "entidad", label: "Entidad u oficina" },
      { name: "duracion", label: "Validez o fecha" },
      { name: "lugar", label: "Lugar" },
    ],
  },
  {
    type: "carta-autorizacion-recogida",
    label: "Autorización para recogida",
    seoTitle: "Generador de carta de autorización para recogida",
    seoDescription: "Redacta una carta para autorizar a otra persona a recoger documentación.",
    summary: "Carta breve para autorizar recogida de documentos ante oficina, entidad o administración.",
    category: "Profesional",
    includesSignatures: true,
    generationGuidance:
      "Redacta como carta de autorización breve y práctica para recogida de documentación. Incluye autorizante, autorizado, documento a recoger, entidad, fecha, alcance limitado y firmas. No añadas cláusulas contractuales ni lenguaje de poder notarial.",
    fields: [
      { name: "autorizante", label: "Autorizante" },
      { name: "dni_autorizante", label: "DNI/NIF autorizante" },
      { name: "autorizado", label: "Autorizado" },
      { name: "dni_autorizado", label: "DNI/NIF autorizado" },
      { name: "documento_recoger", label: "Documento a recoger" },
      { name: "entidad", label: "Entidad u oficina" },
      { name: "fecha_recogida", label: "Fecha de recogida", type: "date" },
      { name: "lugar", label: "Lugar" },
    ],
  },
  {
    type: "requerimiento-pago",
    label: "Requerimiento de pago",
    seoTitle: "Generador de requerimiento de pago",
    seoDescription: "Prepara una carta formal para reclamar el pago de una cantidad pendiente.",
    summary: "Comunicación formal para deuda, factura, plazo de pago y datos de contacto.",
    category: "Legal",
    includesSignatures: false,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como requerimiento de pago formal y prudente. Incluye acreedor, deudor, origen de la deuda, importe, factura o referencia, fecha de vencimiento, plazo razonable para pagar, medio de pago si se aporta y cierre. Tono firme pero no agresivo. No amenaces con acciones concretas si no se aportan.",
    fields: [
      { name: "acreedor", label: "Acreedor" },
      { name: "deudor", label: "Deudor" },
      { name: "importe", label: "Importe pendiente" },
      { name: "referencia", label: "Factura o referencia" },
      { name: "origen_deuda", label: "Origen de la deuda", type: "textarea" },
      { name: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date" },
      { name: "plazo_pago", label: "Plazo solicitado para pago" },
      { name: "medio_pago", label: "Medio de pago" },
    ],
  },
  {
    type: "reconocimiento-deuda",
    label: "Reconocimiento de deuda",
    seoTitle: "Generador de reconocimiento de deuda",
    seoDescription: "Crea un borrador de reconocimiento de deuda con importe, causa y calendario de pago.",
    summary: "Documento para reconocer una deuda, fijar vencimiento, pagos parciales y firmas.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como reconocimiento de deuda. Incluye acreedor, deudor, importe, causa u origen, forma y calendario de pago, vencimiento, posibles pagos parciales, intereses solo si se aportan, consecuencias prudentes por impago, jurisdicción si se indica y firmas. No inventes intereses.",
    fields: [
      { name: "acreedor", label: "Acreedor" },
      { name: "deudor", label: "Deudor" },
      { name: "importe", label: "Importe de la deuda" },
      { name: "origen", label: "Origen o causa", type: "textarea" },
      { name: "calendario_pago", label: "Calendario de pago", type: "textarea" },
      { name: "vencimiento", label: "Vencimiento" },
      { name: "intereses", label: "Intereses o recargos" },
      { name: "jurisdiccion", label: "Jurisdicción" },
    ],
  },
  {
    type: "recibo-pago",
    label: "Recibo de pago",
    seoTitle: "Generador de recibo de pago",
    seoDescription: "Genera un recibo sencillo para acreditar un pago recibido.",
    summary: "Recibo profesional con pagador, receptor, importe, concepto, fecha y firma.",
    category: "Comercial",
    includesSignatures: true,
    generationGuidance:
      "Redacta como recibo de pago sencillo. Incluye receptor, pagador, importe, concepto, fecha, método de pago, referencia si existe, declaración de recepción y firma. No lo presentes como factura fiscal si no lo es.",
    fields: [
      { name: "receptor_pago", label: "Quien recibe el pago" },
      { name: "pagador", label: "Pagador" },
      { name: "importe", label: "Importe" },
      { name: "concepto", label: "Concepto", type: "textarea" },
      { name: "fecha_pago", label: "Fecha de pago", type: "date" },
      { name: "metodo_pago", label: "Método de pago" },
      { name: "referencia", label: "Referencia" },
    ],
  },
  {
    type: "informe-incidencia",
    label: "Informe de incidencia",
    seoTitle: "Generador de informe de incidencia",
    seoDescription: "Crea un informe interno de incidencia con hechos, impacto y acciones tomadas.",
    summary: "Documento operativo para registrar incidencias, responsables, impacto y próximos pasos.",
    category: "Profesional",
    includesSignatures: false,
    generationGuidance:
      "Redacta como informe interno de incidencia. Incluye fecha, área, descripción objetiva, impacto, personas implicadas si se aportan, acciones tomadas, estado, responsable y próximos pasos. Evita culpar sin hechos verificables.",
    fields: [
      { name: "titulo", label: "Título de la incidencia" },
      { name: "fecha", label: "Fecha", type: "date" },
      { name: "area", label: "Área o proyecto" },
      { name: "descripcion", label: "Descripción de la incidencia", type: "textarea" },
      { name: "impacto", label: "Impacto", type: "textarea" },
      { name: "acciones_tomadas", label: "Acciones tomadas", type: "textarea" },
      { name: "responsable", label: "Responsable" },
      { name: "proximos_pasos", label: "Próximos pasos", type: "textarea" },
    ],
  },
  {
    type: "encargo-tratamiento-datos",
    label: "Encargo de tratamiento de datos",
    seoTitle: "Generador de encargo de tratamiento de datos",
    seoDescription: "Prepara un borrador de acuerdo de encargo de tratamiento RGPD.",
    summary: "Documento para responsable, encargado, servicios, datos tratados, seguridad y subencargados.",
    category: "Legal",
    includesSignatures: true,
    requiredPlan: "pro",
    generationGuidance:
      "Redacta como acuerdo de encargo de tratamiento de datos con mucha prudencia. Incluye responsable, encargado, servicio, categorías de datos e interesados si se aportan, instrucciones, medidas de seguridad, confidencialidad, subencargados, transferencias como pendiente si faltan, asistencia al responsable, destino de datos al finalizar y firmas. No inventes herramientas ni medidas concretas.",
    fields: [
      { name: "responsable", label: "Responsable del tratamiento" },
      { name: "encargado", label: "Encargado del tratamiento" },
      { name: "servicio", label: "Servicio prestado", type: "textarea" },
      { name: "datos_tratados", label: "Datos tratados", type: "textarea" },
      { name: "interesados", label: "Categorías de interesados" },
      { name: "medidas_seguridad", label: "Medidas de seguridad", type: "textarea" },
      { name: "subencargados", label: "Subencargados" },
      { name: "destino_final", label: "Destino de los datos al finalizar" },
    ],
  },
] as const satisfies readonly DocumentTypeConfig[];

export const futureDocumentTypes = [
  "Carta de despido disciplinario",
  "Contrato de préstamo entre particulares",
  "Política interna de uso de dispositivos",
  "Protocolo de onboarding de empleado",
  "Solicitud de aplazamiento de pago",
];

export const documentTypeValues = documentTypes.map((item) => item.type) as [DocumentType, ...DocumentType[]];

export const generatePayloadSchema = z.object({
  docType: z.enum(documentTypeValues),
  formData: z.record(z.string(), z.string().trim().max(4000)),
  workspaceId: z.string().uuid().optional().nullable(),
  referenceTemplateId: z.string().uuid().optional().nullable(),
  templateUsageMode: z.enum(templateUsageModes).optional().default(defaultTemplateUsageMode),
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
