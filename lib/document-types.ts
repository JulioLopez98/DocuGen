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
  | "inventario-inmueble";

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
    seoDescription: "Prepara una politica de cookies para una web espanola.",
    summary: "Borrador web con tipos de cookies, finalidad, titular y gestion del consentimiento.",
    category: "Web",
    includesSignatures: false,
    generationGuidance:
      "Redacta una politica de cookies para Espana. Incluye titular, que son las cookies, tipos usados, finalidades, terceros si se indican, gestion del consentimiento, revocacion y contacto. Usa pendientes si no hay detalle tecnico.",
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
      "Redacta como acuerdo de teletrabajo para Espana. Incluye empresa, trabajador, modalidad, lugar, jornada, disponibilidad, medios aportados, gastos, prevencion de riesgos, proteccion de datos, duracion, reversibilidad y firmas. Recomienda revision laboral.",
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
  referenceTemplateId: z.string().uuid().optional().nullable(),
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
