import OpenAI from "openai";
import type { DocumentType, DocumentTypeConfig } from "@/lib/document-types";
import type { RefinementMode } from "@/lib/refinement";
import { defaultTemplateUsageMode, templateUsageLabels, type TemplateUsageMode } from "@/lib/template-usage";

export type TemplateReference = {
  id?: string;
  name: string;
  category: string | null;
  summary: string | null;
  extractedText: string;
  usageMode?: TemplateUsageMode;
};

export type CustomDocumentPromptInput = {
  title: string;
  description: string;
  intendedUse?: string | null;
  tone: string;
  sector?: string | null;
  requiredData?: string | null;
};

export const DEFAULT_MODEL = process.env.OPENAI_MODEL_DEFAULT || "gpt-4.1-mini";
export const PREMIUM_MODEL = process.env.OPENAI_MODEL_PREMIUM || "gpt-4.1";

const refinementRules: Record<RefinementMode, string> = {
  formal:
    "Haz el documento mas formal, sobrio y preciso. Mantiene estructura, datos, marcadores pendientes y aviso final. No anadas datos nuevos.",
  brief:
    "Haz el documento mas breve y directo. Reduce redundancias, conserva datos esenciales, marcadores pendientes, obligaciones importantes y aviso final. No elimines informacion critica.",
  commercial:
    "Haz el documento mas orientado a cliente y conversion cuando encaje. Mejora claridad, beneficios, proximos pasos y lectura comercial. No conviertas contratos o documentos legales en publicidad.",
  natural:
    "Haz el documento mas natural, humano y fluido. Reduce rigidez innecesaria sin perder profesionalidad. No cambies hechos, datos, condiciones ni avisos.",
};

export const documentInstructions =
  "Eres un asistente experto en redaccion de documentos profesionales para Espana. Generas borradores claros, utiles, sobrios y adaptados al contexto espanol. No das asesoramiento legal definitivo ni prometes validez legal. Mantienes el formato natural de cada documento: una carta debe sonar a carta, una propuesta a propuesta comercial, un acta a acta, un email a email y un contrato a contrato. No inventes datos no proporcionados. Usa [PENDIENTE DE COMPLETAR] cuando falte informacion necesaria. No copies literalmente ejemplos ni datos sensibles. Incluye siempre un aviso final breve indicando que el documento es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.";

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
  "contrato-freelance":
    "Regla especial: redacta como contrato de prestacion de servicios entre profesional independiente y cliente. Incluye objeto, alcance, entregables, precio, forma de pago, duracion, obligaciones, propiedad intelectual si procede, confidencialidad proporcionada, resolucion y firmas. No incluyas relacion laboral si no se aporta.",
  "carta-presentacion":
    "Regla especial: escribe una carta en primera persona, natural y creible. No uses secciones numeradas, clausulas, partes identificadas, autorizaciones legales ni bloque de firmas legal. Debe caber aproximadamente en una pagina. Evita frases genericas; conecta experiencia y motivacion con el puesto y la empresa. No menciones detalles irrelevantes aunque esten en motivacion si perjudican la candidatura; reformulalos profesionalmente.",
  "carta-renuncia":
    "Regla especial: redacta como carta breve de baja voluntaria, respetuosa y directa. No uses formato contractual, clausulas ni referencias legales innecesarias. Debe incluir fecha efectiva, preaviso si se aporta, agradecimiento opcional y cierre con nombre.",
  "carta-reclamacion-empresa":
    "Regla especial: redacta como carta formal, no como contrato. Expone hechos por orden, referencia, solicitud concreta, plazo razonable y cierre. Tono firme y educado, sin amenazas no justificadas.",
  "propuesta-proyecto":
    "Regla especial: suena como una propuesta comercial atractiva. Incluye resumen ejecutivo, objetivo, alcance, entregables, metodologia, calendario, inversion, condiciones y proximos pasos. No uses tono de contrato.",
  "presupuesto-comercial":
    "Regla especial: presenta conceptos y costes con claridad. No redactes un contrato. Incluye validez, condiciones de pago y aceptacion breve si procede. Si faltan impuestos, marca [PENDIENTE DE COMPLETAR].",
  "politica-privacidad":
    "Regla especial: estructura como politica RGPD/LOPDGDD prudente: responsable, finalidades, legitimacion, conservacion, destinatarios, derechos, seguridad, reclamacion ante AEPD y contacto. No inventes encargados, transferencias ni plazos.",
  "aviso-legal":
    "Regla especial: incluye identificacion del titular, objeto web, condiciones de uso, propiedad intelectual, responsabilidad, enlaces a privacidad/cookies si faltan como pendiente, legislacion y jurisdiccion.",
  "terminos-condiciones-web":
    "Regla especial: redacta terminos de uso o condiciones web para publicacion. Incluye titular, objeto, acceso/uso, compra o contratacion si procede, pagos, cancelaciones, propiedad intelectual, responsabilidad, contacto y legislacion. No incluyas firmas.",
  "politica-cookies":
    "Regla especial: no inventes cookies concretas. Si no se facilitan herramientas, usa [PENDIENTE DE COMPLETAR]. Incluye gestion/revocacion del consentimiento.",
  "politica-devoluciones":
    "Regla especial: redacta politica para ecommerce, clara para consumidores. Incluye plazo, condiciones del producto, procedimiento, costes, reembolso, excepciones y contacto. No prometas derechos o exclusiones no aportadas.",
  "politica-envios":
    "Regla especial: redacta politica de envios con zonas, plazos, costes, transportistas si se aportan, seguimiento, incidencias y contacto. No inventes transportistas ni plazos.",
  "consentimiento-newsletter":
    "Regla especial: redacta texto breve de consentimiento para formulario o landing. Debe ser claro, directo y apto para usuario final; no lo conviertas en politica larga.",
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
    "Regla especial: formato accionable. Incluye asistentes, agenda, puntos tratados, acuerdos, tareas, responsables y fechas. No incluyas aviso legal largo, clausulas, firmas legales ni lenguaje contractual.",
  "reclamacion-formal-email":
    "Regla especial: redacta como email con asunto, saludo, hechos, solicitud, plazo y cierre. Tono firme, educado y no agresivo.",
  "respuesta-reclamacion":
    "Regla especial: tono empatico y prudente. Acusa recibo, resume la reclamacion, explica posicion, solucion/plazos y canal de contacto. No admitas responsabilidad si no se indica.",
  "factura-proforma":
    "Regla especial: debe quedar claro que es proforma y no factura definitiva. Usa formato ordenado con conceptos, base, impuestos, total, validez y pago.",
  "acuerdo-nda":
    "Regla especial: NDA sencillo y equilibrado. Define informacion confidencial, uso permitido, obligaciones, exclusiones, duracion, devolucion/destruccion, jurisdiccion y firmas. No incluyas penalizaciones si no se aportan.",
  "acuerdo-confidencialidad-ampliado":
    "Regla especial: NDA avanzado. Separa definiciones, informacion cubierta, obligaciones, medidas de proteccion, exclusiones, uso permitido, retorno/destruccion, duracion, consecuencias proporcionadas, jurisdiccion y firmas.",
  "acuerdo-colaboracion":
    "Regla especial: acuerdo equilibrado entre partes. Define objeto, responsabilidades de cada parte, coordinacion, duracion, condiciones economicas, confidencialidad si procede, terminacion y firmas.",
  "prestacion-servicios-empresa":
    "Regla especial: contrato B2B de servicios. Concreta alcance, entregables, facturacion, pagos, obligaciones, propiedad intelectual/confidencialidad si procede, terminacion y firmas.",
  "acuerdo-socios-basico":
    "Regla especial: borrador prudente de acuerdo entre socios. Incluye aportaciones, participaciones, roles, decisiones, dedicacion, salida, confidencialidad y resolucion de conflictos. No sustituyas pacto societario profesional.",
  "compraventa-sencilla":
    "Regla especial: contrato sencillo de compraventa de bien mueble o acuerdo simple. Identifica bien, estado, precio, pago, entrega, manifestaciones basicas y firmas. No lo conviertas en escritura ni compraventa inmobiliaria.",
  "certificado-prestacion-servicios":
    "Regla especial: certificado breve, formal y verificable. No uses clausulas. Incluye quien certifica, a quien se certifica, servicio, periodo, fecha y firma sencilla.",
  "condiciones-generales-venta":
    "Regla especial: condiciones generales para venta o ecommerce. Usa lenguaje publicable y claro: vendedor, proceso de compra, precios, pagos, envios/entrega, devoluciones/desistimiento si procede, garantias, atencion al cliente y responsabilidad.",
  "pacto-no-competencia":
    "Regla especial: mucha prudencia. Incluye ambito, actividades, territorio, duracion y compensacion solo si se aportan. Resalta revision profesional por posible impacto laboral/mercantil.",
  "cesion-derechos-pi":
    "Regla especial: identifica obra, derechos cedidos, modalidad, territorio, duracion, exclusividad, contraprestacion, autoria/creditos si procede y firmas. No asumas cesion total si no se indica.",
  "contrato-arras":
    "Regla especial: marca como [PENDIENTE DE COMPLETAR] cualquier dato de inmueble, cargas, tipo de arras o plazo no aportado. Recomienda revision profesional antes de firmar.",
  "inventario-inmueble":
    "Regla especial: formato de anexo/inventario. Organiza por estancias, mobiliario, llaves, contadores, estado, observaciones y firmas. No redactes contrato de alquiler completo.",
  "orden-compra":
    "Regla especial: documento operativo, no contrato extenso. Incluye comprador, proveedor, referencia, conceptos, cantidades si se aportan, importe, entrega, pago y contacto.",
  "albaran-entrega":
    "Regla especial: documento de entrega/recepcion. Lista productos o materiales, cantidades si se aportan, estado, observaciones, fecha/lugar y firmas de entrega/recepcion.",
};

const forbiddenByIntent: Partial<Record<DocumentType, string>> = {
  "carta-presentacion": "Prohibido: clausulas, partes identificadas, encabezados juridicos, firmas legales, autorizaciones de datos, tono de contrato.",
  "carta-renuncia": "Prohibido: clausulas contractuales, amenazas, exposiciones largas, asesoramiento laboral definitivo.",
  "acta-reunion": "Prohibido: clausulas, obligaciones contractuales extensas, firmas legales, lenguaje de contrato.",
  "presupuesto-comercial": "Prohibido: convertirlo en contrato, clausulas juridicas largas, jurisdiccion salvo que se aporte.",
  "propuesta-proyecto": "Prohibido: tono legalista, clausulas numeradas, amenazas de incumplimiento, lenguaje frio.",
  "aviso-legal": "Prohibido: bloque de firmas, clausulas de contrato entre partes, datos tecnicos inventados.",
  "politica-privacidad": "Prohibido: inventar encargados, transferencias internacionales, herramientas, plazos o bases legales no aportadas.",
  "politica-cookies": "Prohibido: inventar nombres de cookies o herramientas de analitica/publicidad no aportadas.",
  "politica-devoluciones": "Prohibido: prometer reembolsos, plazos o excepciones no aportadas.",
  "politica-envios": "Prohibido: inventar transportistas, zonas, costes o plazos.",
  "consentimiento-newsletter": "Prohibido: texto largo de politica completa, casillas premarcadas, consentimiento ambiguo.",
  "factura-proforma": "Prohibido: presentarla como factura fiscal definitiva.",
};

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function buildDocumentPrompt(config: DocumentTypeConfig, formData: Record<string, string>, templateReference?: TemplateReference | null) {
  const values = config.fields
    .map((field) => `- ${field.label} (${field.name}): ${formData[field.name] || "[PENDIENTE DE COMPLETAR]"}`)
    .join("\n");
  const structureRules = getStructureRules(config);
  const familyRules = categoryRules[config.category] || "Usa una estructura profesional clara y adaptada al tipo de documento.";
  const specialRules = typeRules[config.type] || "No hay reglas especiales adicionales para este tipo.";
  const forbiddenRules = forbiddenByIntent[config.type] || getDefaultForbiddenRules(config);
  const outputStyle = getOutputStyle(config);
  const missingFields = getMissingFields(config, formData);
  const templateBlock = templateReference ? buildTemplateReferenceBlock(templateReference) : "No se ha seleccionado plantilla de referencia.";

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

Reglas de estilo de salida:
${outputStyle}

Reglas de cosas prohibidas para este caso:
${forbiddenRules}

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
- No incluyas explicaciones sobre como has generado el documento; devuelve solo el documento final.
- Si el usuario aporta texto informal o poco profesional, reformulalo con tono profesional sin cambiar hechos.

Firmas:
${config.includesSignatures ? "Incluye bloque final de firmas adaptado al documento." : "No incluyas bloque de firmas formal."}

Campos pendientes detectados:
${missingFields.length > 0 ? missingFields.map((field) => `- ${field}`).join("\n") : "- No se detectan campos vacios."}

Checklist interno antes de responder:
- El formato coincide con el tipo de documento.
- No se han inventado datos.
- Los campos vacios aparecen como [PENDIENTE DE COMPLETAR].
- No hay clausulas en cartas, emails, actas o documentos web informativos.
- El aviso final es breve y proporcionado.

Plantilla de referencia:
${templateBlock}

Datos proporcionados:
${values}`;
}

export function buildRefinementPrompt({
  config,
  formData,
  content,
  mode,
}: {
  config: DocumentTypeConfig;
  formData: Record<string, string>;
  content: string;
  mode: RefinementMode;
}) {
  const basePrompt = buildDocumentPrompt(config, formData);
  const refinementRule = refinementRules[mode];

  return `${basePrompt}

Tarea de refinamiento:
${refinementRule}

Reglas adicionales para la variante:
- Reescribe el documento completo, no devuelvas solo cambios parciales.
- Conserva los datos proporcionados y los marcadores [PENDIENTE DE COMPLETAR].
- No cambies importes, fechas, partes, condiciones ni hechos.
- No inventes informacion nueva.
- Mantiene el formato adecuado al tipo de documento.
- Mantiene el aviso final breve de revision profesional.
- Devuelve solo la nueva version del documento.

Documento actual a mejorar:
${content}`;
}

export function buildCustomDocumentPrompt(input: CustomDocumentPromptInput) {
  return `Genera un borrador profesional personalizado para Espana.

Tipo solicitado por el usuario:
${input.title}

Descripcion de lo que necesita:
${input.description}

Uso previsto:
${input.intendedUse || "[PENDIENTE DE COMPLETAR]"}

Tono solicitado:
${input.tone}

Sector:
${input.sector || "[PENDIENTE DE COMPLETAR]"}

Datos que debe incluir:
${input.requiredData || "[PENDIENTE DE COMPLETAR]"}

Reglas para documento libre:
- Crea un borrador util y estructurado aunque el documento no exista en el catalogo.
- No afirmes que el documento es definitivo, valido legalmente o suficiente sin revision.
- No inventes datos, importes, fechas, nombres, NIF/CIF, domicilios, jurisdicciones, normativas especificas ni obligaciones no aportadas.
- Si falta informacion necesaria, usa exactamente [PENDIENTE DE COMPLETAR].
- Si el documento parece legal, laboral, fiscal, societario, inmobiliario o de proteccion de datos, usa tono prudente y recomienda revision profesional.
- Si la peticion es ambigua, crea una estructura razonable con campos pendientes y apartados editables.
- No generes contenido fraudulento, enganoso, abusivo o destinado a eludir obligaciones legales.
- Incluye al final un aviso breve indicando que es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.
- Devuelve solo el documento final, sin explicar el proceso.`;
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

function getOutputStyle(config: DocumentTypeConfig) {
  if (config.type === "carta-presentacion") {
    return "Extension objetivo: 450-650 palabras como maximo. Estilo: cercano, profesional, en primera persona, sin sonar inflado. Usa parrafos, no listas.";
  }

  if (config.type.includes("email")) {
    return "Extension objetivo: breve y accionable. Incluye asunto. Usa parrafos cortos y una solicitud clara.";
  }

  if (config.type.includes("politica") || config.type === "aviso-legal" || config.type === "terminos-condiciones-web") {
    return "Estilo publicable en web: encabezados claros, frases comprensibles, sin latinismos ni exceso legalista. Evita firmas.";
  }

  if (config.category === "Comercial") {
    return "Estilo comercial: escaneable, orientado a decision, con apartados claros. Usa listas para conceptos, entregables o condiciones.";
  }

  if (config.category === "Laboral") {
    return "Estilo laboral: formal, prudente y preciso. Marca como pendiente cualquier convenio, causa, salario, jornada o dato sensible no proporcionado.";
  }

  if (config.category === "Digital") {
    return "Estilo tecnico-comercial: concreto, sin jerga innecesaria, separando alcance, exclusiones, entregables, revisiones y dependencias.";
  }

  if (config.includesSignatures) {
    return "Estilo formal: clausulas o apartados numerados solo si encajan, lenguaje claro, cierre y firmas.";
  }

  return "Estilo profesional: claro, sobrio, facil de editar y sin relleno.";
}

function getDefaultForbiddenRules(config: DocumentTypeConfig) {
  if (config.category === "Web") {
    return "Prohibido: firmas, datos tecnicos inventados, herramientas no indicadas, afirmaciones absolutas de cumplimiento.";
  }

  if (config.category === "Comercial" && !config.includesSignatures) {
    return "Prohibido: convertirlo en contrato extenso, anadir jurisdiccion o penalizaciones no solicitadas.";
  }

  if (config.category === "Profesional" && !config.includesSignatures) {
    return "Prohibido: lenguaje contractual, clausulas juridicas, partes reunidas, firmas legales.";
  }

  return "Prohibido: inventar datos, garantizar validez legal, anadir obligaciones no derivadas de la informacion aportada.";
}

function getMissingFields(config: DocumentTypeConfig, formData: Record<string, string>) {
  return config.fields.filter((field) => !formData[field.name]?.trim()).map((field) => field.label);
}

function buildTemplateReferenceBlock(reference: TemplateReference) {
  const usageMode = reference.usageMode || defaultTemplateUsageMode;

  return `Nombre: ${reference.name}
Categoria: ${reference.category || "[PENDIENTE DE COMPLETAR]"}
Resumen: ${reference.summary || "[PENDIENTE DE COMPLETAR]"}
Modo de uso: ${templateUsageLabels[usageMode]}

Instrucciones para usar la plantilla:
- ${getTemplateUsageInstruction(usageMode)}
- No copies literalmente clausulas completas salvo que sean genericas, breves y encajen con los datos aportados.
- No reutilices datos personales, importes, nombres, direcciones, emails, fechas ni condiciones concretas de la plantilla.
- Si hay conflicto entre la plantilla y los datos del formulario, manda siempre la informacion del formulario.
- Mantiene las reglas del tipo de documento seleccionado por encima de la plantilla.

Texto extraido de la plantilla:
${reference.extractedText.slice(0, 12000)}`;
}

function getTemplateUsageInstruction(mode: TemplateUsageMode) {
  if (mode === "structure") {
    return "Usa la plantilla principalmente como mapa de secciones, orden de apartados y nivel de detalle. No imites necesariamente el tono ni el wording.";
  }

  if (mode === "tone") {
    return "Usa la plantilla principalmente como referencia de tono, formalidad, longitud y estilo de redaccion. No repliques su estructura exacta si el tipo documental pide otra.";
  }

  if (mode === "light") {
    return "Usa la plantilla solo como inspiracion suave. Prioriza claramente el tipo documental, los datos del formulario y las reglas de DocuGen.";
  }

  return "Usa la plantilla como referencia de estructura, tono, orden de apartados y estilo, sin copiar datos concretos.";
}
