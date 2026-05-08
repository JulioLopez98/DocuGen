import OpenAI from "openai";
import type { DocumentType, DocumentTypeConfig } from "@/lib/document-types";

export const DEFAULT_MODEL = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
export const PREMIUM_MODEL = process.env.OPENAI_MODEL_PREMIUM || "gpt-4.1";

export const documentInstructions =
  "Eres un asistente experto en redaccion de documentos profesionales para Espana. Generas borradores claros, utiles, sobrios y adaptados al contexto espanol. No das asesoramiento legal definitivo ni prometes validez legal. Mantienes el formato natural de cada documento: una carta debe sonar a carta, una propuesta a propuesta comercial, un acta a acta, un email a email y un contrato a contrato. No inventes datos no proporcionados. Usa [PENDIENTE DE COMPLETAR] cuando falte informacion necesaria. Incluye siempre un aviso final indicando que el documento es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.";

const categoryRules: Record<string, string> = {
  Comercial:
    "Familia comercial: prioriza claridad, orientacion a cliente y lectura rapida. Evita lenguaje juridico excesivo. Usa tablas o listados para conceptos, importes, entregables o condiciones cuando ayude. Incluye proximos pasos o aceptacion solo si encaja.",
  Legal:
    "Familia legal: estructura formal con identificacion de partes, antecedentes si aportan contexto, clausulas numeradas, obligaciones, duracion, consecuencias, jurisdiccion y aviso de revision profesional. No afirmes que el documento es definitivo ni suficiente por si solo.",
  Web:
    "Familia web: redacta como documento informativo para publicar en una web. Usa apartados claros, lenguaje comprensible para usuarios y referencias a normativa espanola solo de forma prudente. No incluyas firmas. Si faltan datos tecnicos, marca [PENDIENTE DE COMPLETAR].",
  Profesional:
    "Familia profesional: usa tono humano, directo y util. Evita formato contractual salvo que el documento sea un certificado. En cartas, emails y actas no uses clausulas juridicas ni partes reunidas.",
  Empresa:
    "Familia empresa: usa tono B2B, equilibrado y operacional. Define responsabilidades, alcance, decision, plazos, propiedad o confidencialidad cuando aplique. Evita excesos legales si el documento es operativo.",
  Laboral:
    "Familia laboral: usa tono formal y prudente. Incluye datos de empresa y trabajador cuando proceda, puesto, jornada, salario, fechas, convenio si se aporta y revision por asesor laboral. No garantices cumplimiento normativo.",
  "Laboral y servicios":
    "Familia laboral y servicios: redacta como relacion profesional de prestacion de servicios, con alcance, precio, pagos, duracion, obligaciones, entregables y firmas si procede. Diferencia claramente freelancer/cliente.",
  Digital:
    "Familia digital: concreta alcance tecnico, entregables, revisiones, dependencias del cliente, plazos, pagos, aceptacion, mantenimiento, propiedad intelectual y exclusiones. Evita promesas tecnicas no aportadas.",
  Inmobiliario:
    "Familia inmobiliaria: identifica inmueble, partes, importes, plazos, estado, entrega, anexos y firmas. Usa lenguaje formal y marca cualquier dato registral, cargas o informacion pendiente como [PENDIENTE DE COMPLETAR].",
};

const typeRules: Partial<Record<DocumentType, string>> = {
  "carta-presentacion":
    "Regla especial: escribe una carta en primera persona, natural y creible. No uses secciones numeradas, clausulas, partes identificadas ni bloque de firmas legal. Debe caber aproximadamente en una pagina. Evita frases genericas; conecta experiencia y motivacion con el puesto y la empresa.",
  "propuesta-proyecto":
    "Regla especial: suena como una propuesta comercial atractiva. Incluye resumen ejecutivo, objetivo, alcance, entregables, metodologia, calendario, inversion, condiciones y proximos pasos. No uses tono de contrato.",
  "presupuesto-comercial":
    "Regla especial: presenta conceptos y costes con claridad. No redactes un contrato. Incluye validez, condiciones de pago y aceptacion breve si procede. Si faltan impuestos, marca [PENDIENTE DE COMPLETAR].",
  "politica-privacidad":
    "Regla especial: estructura como politica RGPD/LOPDGDD prudente: responsable, finalidades, legitimacion, conservacion, destinatarios, derechos, seguridad, reclamacion ante AEPD y contacto. No inventes encargados, transferencias ni plazos.",
  "aviso-legal":
    "Regla especial: incluye identificacion del titular, objeto web, condiciones de uso, propiedad intelectual, responsabilidad, enlaces a privacidad/cookies si faltan como pendiente, legislacion y jurisdiccion.",
  "politica-cookies":
    "Regla especial: no inventes cookies concretas. Si no se facilitan herramientas, usa [PENDIENTE DE COMPLETAR]. Incluye gestion/revocacion del consentimiento.",
  "contrato-trabajo-indefinido":
    "Regla especial: maxima prudencia laboral. Incluye convenio, periodo de prueba, jornada, salario, vacaciones y centro de trabajo solo con datos aportados o pendientes. No generes clausulas abusivas.",
  "contrato-temporal":
    "Regla especial: destaca la causa temporal. Si no esta suficientemente descrita, marca [PENDIENTE DE COMPLETAR] y advierte revision laboral.",
  "acuerdo-teletrabajo":
    "Regla especial: incluye medios, gastos, horario, disponibilidad, prevencion, proteccion de datos, reversibilidad y lugar de teletrabajo. No inventes compensaciones.",
  "contrato-desarrollo-web":
    "Regla especial: concreta alcance y exclusiones. Incluye dependencias del cliente, revisiones, aceptacion, cambios de alcance, propiedad intelectual, hosting/mantenimiento si procede y pagos por hitos.",
  "contrato-mantenimiento-web":
    "Regla especial: separa incluido/no incluido, tiempos de respuesta, horario, urgencias, seguridad, copias, cuota y terminacion. Evita SLA no proporcionados.",
  "acta-reunion":
    "Regla especial: formato accionable. Incluye asistentes, agenda, puntos tratados, acuerdos, tareas, responsables y fechas. No incluyas aviso legal largo ni clausulas.",
  "reclamacion-formal-email":
    "Regla especial: redacta como email con asunto, saludo, hechos, solicitud, plazo y cierre. Tono firme, educado y no agresivo.",
  "respuesta-reclamacion":
    "Regla especial: tono empatico y prudente. Acusa recibo, resume la reclamacion, explica posicion, solucion/plazos y canal de contacto. No admitas responsabilidad si no se indica.",
  "factura-proforma":
    "Regla especial: debe quedar claro que es proforma y no factura definitiva. Usa formato ordenado con conceptos, base, impuestos, total, validez y pago.",
};

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
  const structureRules = getStructureRules(config);
  const familyRules = categoryRules[config.category] || "Usa una estructura profesional clara y adaptada al tipo de documento.";
  const specialRules = typeRules[config.type] || "No hay reglas especiales adicionales para este tipo.";

  return `Genera un borrador profesional para Espana.

Tipo de documento: ${config.label}
Categoria: ${config.category}

Objetivo:
Crear un borrador util, editable y listo para revision. Debe sonar especifico, no generico.

Reglas de estructura:
${structureRules}

Reglas de familia:
${familyRules}

Reglas especiales del tipo:
${specialRules}

Instrucciones especificas configuradas:
${config.generationGuidance}

Reglas de calidad:
- Usa lenguaje claro, profesional y adaptado a Espana.
- No inventes datos, importes, fechas, normativas especificas, herramientas, juzgados, convenios ni obligaciones no proporcionadas.
- Si falta informacion necesaria, usa exactamente [PENDIENTE DE COMPLETAR].
- Evita relleno, frases grandilocuentes y repeticiones.
- No conviertas cartas, emails, propuestas, actas, politicas web ni documentos comerciales simples en contratos.
- No uses "clausulas" salvo en contratos, acuerdos legales o documentos que lo pidan de forma natural.
- Mantiene un aviso final breve de revision profesional.

Firmas:
${config.includesSignatures ? "Incluye bloque final de firmas adaptado al documento." : "No incluyas bloque de firmas formal."}

Datos proporcionados:
${values}`;
}

function getStructureRules(config: DocumentTypeConfig) {
  if (config.type.includes("email")) {
    return "Formato email: asunto, saludo, cuerpo breve por parrafos, solicitud o cierre claro, despedida y datos de contacto si proceden.";
  }

  if (config.type.includes("carta")) {
    return "Formato carta: titulo opcional, fecha si aporta valor, destinatario si se conoce, saludo, cuerpo en parrafos, cierre cordial y firma textual sencilla.";
  }

  if (config.category === "Web") {
    return "Formato web: titulo, fecha o version si procede, apartados informativos con encabezados claros, contenido listo para publicar y aviso final. Sin firmas.";
  }

  if (config.category === "Comercial" && !config.includesSignatures) {
    return "Formato comercial: titulo, fecha, emisor/cliente si procede, resumen, detalle en apartados o listas, condiciones claras y cierre con proximos pasos si aplica.";
  }

  if (config.category === "Profesional" && !config.includesSignatures) {
    return "Formato profesional no contractual: titulo, fecha si procede, secciones simples o parrafos naturales, acciones/resumen y cierre.";
  }

  if (config.includesSignatures) {
    return "Formato formal: titulo, fecha, identificacion de partes, antecedentes si aportan contexto, apartados o clausulas numeradas, cierre, aviso final y bloque de firmas.";
  }

  return "Formato profesional: titulo, fecha si aporta valor, apartados claros, cuerpo conciso y aviso final.";
}
