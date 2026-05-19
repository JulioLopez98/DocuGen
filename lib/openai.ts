import OpenAI from "openai";
import type { DocumentType, DocumentTypeConfig } from "@/lib/document-types";
import type { RefinementMode } from "@/lib/refinement";
import type { CommunityDocumentTypeRow } from "@/lib/supabase-server";
import { defaultTemplateUsageMode, templateUsageLabels, type TemplateUsageMode } from "@/lib/template-usage";

export type TemplateReference = {
  id?: string;
  name: string;
  category: string | null;
  summary: string | null;
  metadata?: Record<string, unknown> | null;
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

export type CommunityDocumentPromptInput = {
  type: Pick<CommunityDocumentTypeRow, "label" | "description" | "category" | "prompt_brief" | "suggested_fields">;
  formData: Record<string, string>;
};

export type TemplateDirectPromptInput = {
  template: TemplateReference;
  values: Record<string, string>;
  extraInstructions?: string | null;
};

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
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

export function buildTemplateDirectPrompt(input: TemplateDirectPromptInput) {
  const variableValues = Object.entries(input.values)
    .map(([key, value]) => `- ${key}: ${value || "[PENDIENTE DE COMPLETAR]"}`)
    .join("\n");
  const analysisBlock = buildTemplateAnalysisBlock(input.template.metadata);

  return `Genera un documento profesional para Espana usando una plantilla concreta del usuario.

Objetivo:
Crear un documento nuevo siguiendo fielmente la estructura, tono y finalidad de la plantilla, pero sustituyendo los datos por la informacion aportada por el usuario.

Plantilla:
- Nombre: ${input.template.name}
- Categoria: ${input.template.category || "[PENDIENTE DE COMPLETAR]"}
- Resumen: ${input.template.summary || "[PENDIENTE DE COMPLETAR]"}

Analisis extraido:
${analysisBlock}

Datos que debe usar el documento:
${variableValues || "- [PENDIENTE DE COMPLETAR]"}

Instrucciones adicionales del usuario:
${input.extraInstructions?.trim() || "[PENDIENTE DE COMPLETAR]"}

Reglas obligatorias:
- Usa la plantilla como modelo principal de estructura, orden, tono y tipo documental.
- No copies datos concretos de la plantilla original: nombres, NIF/CIF, emails, telefonos, direcciones, importes, fechas, clientes, proveedores, cuentas bancarias ni condiciones particulares.
- Sustituye placeholders y campos equivalentes por los datos aportados.
- Si falta un dato necesario, usa exactamente [PENDIENTE DE COMPLETAR].
- Reescribe con palabras nuevas cuando una clausula o frase de la plantilla parezca demasiado especifica.
- No expliques el proceso ni menciones que has usado una plantilla.
- Mantiene un aviso final breve: documento generado con IA y debe revisarse por un profesional antes de uso legal o profesional relevante.
- Devuelve solo el documento final.

Texto extraido de la plantilla:
${input.template.extractedText.slice(0, 14000)}`;
}

export function buildAssistantChatPrompt(messages: AssistantChatMessage[]) {
  const conversation = messages
    .slice(-12)
    .map((message) => `${message.role === "user" ? "Usuario" : "DocuGen"}: ${message.content}`)
    .join("\n\n");

  return `Actua como asistente conversacional de DocuGen para usuarios Pro.

Objetivo:
Ayudar al usuario a definir un documento profesional para Espana cuando no sabe que tipo elegir o cuando no existe aun en el catalogo.

Comportamiento:
- Haz preguntas concretas para completar informacion faltante.
- Sugiere el tipo documental mas parecido si existe.
- Si parece un documento a medida, orienta al usuario para reunir datos antes de generarlo.
- No des asesoramiento legal definitivo.
- No prometas validez legal.
- No generes aun un documento completo salvo que el usuario lo pida explicitamente; en esta fase prioriza aclarar requisitos.
- Si el documento puede tener efectos legales, laborales, fiscales, inmobiliarios, societarios o de proteccion de datos, recuerda revision profesional.
- Mantente breve, profesional y util.
- Cuando tengas suficiente informacion, resume en una lista:
  1. Tipo de documento recomendado.
  2. Datos disponibles.
  3. Datos que faltan.
  4. Siguiente accion recomendada.

Conversacion:
${conversation}`;
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

export function buildEditableImprovementPrompt({
  title,
  docType,
  content,
  mode,
  customInstruction,
}: {
  title: string;
  docType: string;
  content: string;
  mode: "formal" | "brief" | "commercial" | "natural" | "legal_review" | "custom";
  customInstruction?: string | null;
}) {
  const modeRules: Record<typeof mode, string> = {
    formal:
      "Haz el documento mas formal, sobrio y preciso. Mejora redaccion, estructura y claridad sin hacerlo innecesariamente legalista.",
    brief:
      "Haz el documento mas breve y directo. Reduce repeticiones y relleno, pero conserva datos, condiciones, obligaciones, marcadores pendientes y aviso final.",
    commercial:
      "Haz el documento mas claro y persuasivo cuando encaje. Mejora propuesta de valor, lectura rapida y proximos pasos, sin alterar hechos ni convertir documentos legales en publicidad.",
    natural:
      "Haz el documento mas natural, humano y fluido. Reduce rigidez innecesaria y conserva profesionalidad, datos y estructura esencial.",
    legal_review:
      "Mejora prudencia, coherencia y claridad profesional. No des asesoramiento legal definitivo. Marca lagunas con [PENDIENTE DE COMPLETAR] y evita afirmaciones absolutas.",
    custom:
      customInstruction?.trim()
        ? customInstruction.trim()
        : "Mejora el documento manteniendo datos, estructura esencial y aviso final.",
  };

  return `Mejora el siguiente documento editado por el usuario.

Titulo:
${title}

Tipo interno:
${docType}

Objetivo de mejora:
${modeRules[mode]}

Reglas obligatorias:
- Devuelve el documento completo mejorado, no una lista de sugerencias.
- Mantiene todos los datos reales, nombres, importes, fechas, emails, NIF/CIF, domicilios, condiciones y partes.
- No inventes informacion nueva.
- Si detectas informacion insuficiente, usa [PENDIENTE DE COMPLETAR].
- No elimines el aviso final de borrador generado con IA.
- Si el documento puede tener efectos legales, laborales, fiscales, societarios, inmobiliarios o de proteccion de datos, mantén tono prudente.
- Respeta el formato natural del documento: carta como carta, email como email, contrato como contrato, politica web como politica web.
- No añadas explicaciones sobre los cambios ni comentarios fuera del documento final.
- Devuelve solo el documento final.

Documento actual:
${content}`;
}

export function buildCustomDocumentPrompt(input: CustomDocumentPromptInput) {
  const riskRules = getCustomRiskRules(input);
  const toneRules = getCustomToneRules(input.tone);
  const ambiguityRules = getCustomAmbiguityRules(input);

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

Reglas de tono:
${toneRules}

Reglas de riesgo:
${riskRules}

Reglas si falta informacion:
${ambiguityRules}

Reglas para documento libre:
- Crea un borrador util y estructurado aunque el documento no exista en el catalogo.
- No afirmes que el documento es definitivo, valido legalmente o suficiente sin revision.
- No inventes datos, importes, fechas, nombres, NIF/CIF, domicilios, jurisdicciones, normativas especificas ni obligaciones no aportadas.
- Si falta informacion necesaria, usa exactamente [PENDIENTE DE COMPLETAR].
- Si el documento parece legal, laboral, fiscal, societario, inmobiliario o de proteccion de datos, usa tono prudente y recomienda revision profesional.
- Si la peticion es ambigua, crea una estructura razonable con campos pendientes y apartados editables.
- No generes contenido fraudulento, enganoso, abusivo o destinado a eludir obligaciones legales.
- No des instrucciones para evadir contratos, impuestos, derechos laborales, proteccion de datos, garantias, consumidores o autoridades.
- No incluyas citas legales concretas salvo que sean ampliamente necesarias y se formulen con prudencia.
- No uses formulas agresivas, amenazas o acusaciones si el usuario no aporta hechos verificables.
- Si el usuario pide una carta/email, usa formato natural de carta/email. Si pide contrato/acuerdo, usa apartados o clausulas numeradas solo cuando proceda.
- Incluye titulo, fecha si aporta valor y secciones claras.
- Incluye al final un aviso breve indicando que es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.
- Devuelve solo el documento final, sin explicar el proceso.`;
}

export function buildCommunityDocumentPrompt(input: CommunityDocumentPromptInput) {
  const values = input.type.suggested_fields
    .map((field) => `- ${field.label} (${field.name}): ${input.formData[field.name] || "[PENDIENTE DE COMPLETAR]"}`)
    .join("\n");

  return `Genera un borrador profesional para España usando una definición comunitaria aprobada por DocuGen.

Tipo comunitario:
${input.type.label}

Categoría:
${input.type.category || "A medida"}

Descripción editorial:
${input.type.description}

Prompt base revisado por admin:
${input.type.prompt_brief}

Reglas obligatorias:
- Redacta para el contexto español.
- Usa solo los datos aportados por el usuario.
- No inventes nombres, importes, fechas, domicilios, NIF/CIF, normativa concreta, jurisdicción ni condiciones.
- Si falta información necesaria, usa exactamente [PENDIENTE DE COMPLETAR].
- No añadas al final una lista de campos vacíos, metadatos o campos internos.
- No incluyas líneas sueltas como "Uso previsto", "Sector" u otros campos si no aportan valor al documento final.
- Si un campo sugerido está vacío y no es imprescindible para redactar el documento, omítelo.
- Si un campo sugerido está vacío pero sí es imprescindible, intégralo de forma natural en el cuerpo con [PENDIENTE DE COMPLETAR].
- Mantén un tono profesional, claro y proporcionado.
- Si el documento tiene impacto legal, laboral, fiscal, societario, inmobiliario o de protección de datos, redacta con prudencia y recomienda revisión profesional.
- No prometas validez legal ni sustituyas asesoramiento profesional.
- Respeta la intención del tipo comunitario, pero no copies texto de solicitudes anteriores.
- Incluye al final un aviso breve indicando que es un borrador generado con IA y debe revisarse por un profesional si se va a usar con efectos legales o profesionales relevantes.
- Devuelve solo el documento final.

Datos proporcionados:
${values}`;
}

function getCustomToneRules(tone: string) {
  if (tone === "Comercial") {
    return "- Prioriza claridad, propuesta de valor, condiciones escaneables y cierre orientado a accion.\n- Evita lenguaje juridico excesivo salvo que sea imprescindible.";
  }

  if (tone === "Laboral prudente") {
    return "- Usa tono formal, neutral y cuidadoso.\n- Marca salario, convenio, jornada, categoria, fecha efectiva, preaviso o causa como [PENDIENTE DE COMPLETAR] si faltan.\n- Recomienda revision laboral si puede afectar a derechos u obligaciones.";
  }

  if (tone === "Legal prudente") {
    return "- Usa estructura formal, partes identificadas, objeto, obligaciones, duracion, consecuencias proporcionadas y jurisdiccion solo si se aporta.\n- Evita garantizar validez o suficiencia legal.";
  }

  if (tone === "Email") {
    return "- Formato email: asunto, saludo, cuerpo breve por parrafos, solicitud clara, plazo si procede y despedida.\n- No uses clausulas ni bloque de firmas legal.";
  }

  if (tone === "Carta") {
    return "- Formato carta: destinatario si se conoce, fecha, saludo, cuerpo natural, cierre cordial y firma textual sencilla.\n- No uses estructura contractual salvo que el usuario lo pida expresamente.";
  }

  if (tone === "Natural") {
    return "- Usa lenguaje profesional pero humano, directo y facil de leer.\n- Evita rigidez, tecnicismos innecesarios y formulas grandilocuentes.";
  }

  return "- Usa tono formal, claro, sobrio y profesional.\n- Prioriza precision, estructura y facilidad de edicion.";
}

function getCustomRiskRules(input: CustomDocumentPromptInput) {
  const text = `${input.title} ${input.description} ${input.intendedUse || ""} ${input.sector || ""}`.toLowerCase();
  const highRiskTerms = [
    "despido",
    "baja",
    "renuncia",
    "contrato",
    "nda",
    "confidencialidad",
    "reclamacion",
    "demanda",
    "impuesto",
    "iva",
    "rgpd",
    "privacidad",
    "arrendamiento",
    "arras",
    "socios",
    "participaciones",
  ];
  const hasRisk = highRiskTerms.some((term) => text.includes(term));

  if (!hasRisk) {
    return "- No se detecta una materia especialmente sensible, pero mantiene el aviso final y no inventes datos.";
  }

  return "- Se detecta posible materia legal, laboral, fiscal, inmobiliaria, societaria o de datos.\n- Redacta con especial prudencia.\n- Usa [PENDIENTE DE COMPLETAR] para datos criticos.\n- Incluye recordatorio de revision profesional antes de uso con efectos legales o profesionales.";
}

function getCustomAmbiguityRules(input: CustomDocumentPromptInput) {
  const providedSignals = [input.intendedUse, input.sector, input.requiredData].filter((value) => value?.trim()).length;

  if (providedSignals >= 2) {
    return "- Hay contexto suficiente para redactar un borrador especifico.\n- Usa los datos aportados y no anadas supuestos externos.";
  }

  return "- La peticion puede ser ambigua.\n- Crea un borrador con estructura razonable y campos [PENDIENTE DE COMPLETAR].\n- No rellenes lagunas con datos inventados.\n- Incluye apartados editables para que el usuario pueda completar informacion clave.";
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
  const strategy = getTemplateUsageStrategy(usageMode);
  const analysisBlock = buildTemplateAnalysisBlock(reference.metadata);

  return `Nombre: ${reference.name}
Categoria: ${reference.category || "[PENDIENTE DE COMPLETAR]"}
Resumen: ${reference.summary || "[PENDIENTE DE COMPLETAR]"}
Modo de uso: ${templateUsageLabels[usageMode]}
Analisis extraido:
${analysisBlock}

Contrato de uso de la plantilla:
${strategy.contract}

Peso de influencia:
- Estructura: ${strategy.structureWeight}
- Tono: ${strategy.toneWeight}
- Contenido: ${strategy.contentWeight}

Como adaptar la plantilla:
${strategy.adaptationRules}

Reglas anti-copia y privacidad:
- No copies literalmente frases largas, clausulas completas, condiciones particulares ni bloques enteros de la plantilla.
- No reutilices datos personales, importes, nombres, direcciones, emails, telefonos, NIF/CIF, fechas, referencias, clientes, proveedores ni condiciones concretas de la plantilla.
- No arrastres datos que parezcan reales aunque encajen con el nuevo documento. Sustituyelos por datos del formulario o por [PENDIENTE DE COMPLETAR].
- Si la plantilla incluye clausulas o expresiones utiles, reescribelas con palabras nuevas y adaptalas al tipo documental elegido.
- No menciones que has usado una plantilla ni expliques el proceso en el documento final.

Jerarquia de prioridad:
1. Datos proporcionados por el usuario en el formulario.
2. Reglas especiales del tipo de documento seleccionado.
3. Reglas de familia y estilo de DocuGen.
4. Plantilla de referencia segun el modo elegido.

Resolucion de conflictos:
- Si la plantilla contradice los datos del formulario, ignora la plantilla.
- Si la plantilla tiene estructura contractual pero el tipo elegido es carta, email, acta, politica web o propuesta, conserva el formato natural del tipo elegido.
- Si la plantilla contiene informacion insuficiente, confusa, demasiado especifica o riesgosa, usa [PENDIENTE DE COMPLETAR] o una redaccion prudente.
- Si falta un dato critico para adaptar una seccion de la plantilla, no inventes; marca [PENDIENTE DE COMPLETAR].

Checklist interno especifico para plantilla:
- El resultado se parece al modo solicitado, pero no es una copia.
- No aparecen datos concretos de la plantilla original.
- El documento final sigue siendo valido como borrador del tipo solicitado.
- La plantilla no ha introducido clausulas, apartados o tono impropios del documento.
- El aviso final de revision profesional se mantiene breve y proporcionado.

Texto extraido de la plantilla:
${reference.extractedText.slice(0, 12000)}`;
}

function buildTemplateAnalysisBlock(metadata?: Record<string, unknown> | null) {
  if (!metadata) {
    return "- Sin analisis estructurado disponible.";
  }

  const suggestedCategory = readString(metadata.suggestedCategory);
  const tone = readNestedString(metadata.tone, "label");
  const sections = readNamedItems(metadata.sections);
  const clauses = readNamedItems(metadata.clauses);
  const variables = readNamedItems(metadata.variables);
  const sensitiveSignals = readStringArray(metadata.sensitiveSignals);
  const qualityWarnings = readStringArray(readRecord(metadata.quality)?.warnings);

  return [
    `- Categoria sugerida: ${suggestedCategory || "[PENDIENTE DE COMPLETAR]"}`,
    `- Tono detectado: ${tone || "[PENDIENTE DE COMPLETAR]"}`,
    sections.length ? `- Secciones detectadas: ${sections.slice(0, 8).join("; ")}` : "- Secciones detectadas: sin datos claros.",
    clauses.length ? `- Clausulas/bloques utiles: ${clauses.slice(0, 6).join("; ")}` : "- Clausulas/bloques utiles: sin datos claros.",
    variables.length ? `- Variables posibles: ${variables.slice(0, 10).join("; ")}` : "- Variables posibles: no detectadas.",
    sensitiveSignals.length
      ? `- Senales de datos concretos que NO debes copiar: ${sensitiveSignals.join(", ")}`
      : "- Senales de datos concretos: no detectadas.",
    qualityWarnings.length ? `- Advertencias de calidad: ${qualityWarnings.join("; ")}` : "- Advertencias de calidad: ninguna destacada.",
  ].join("\n");
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNestedString(value: unknown, key: string) {
  const record = readRecord(value);
  return record ? readString(record[key]) : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readNamedItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record = readRecord(item);
      return readString(record?.title) || readString(record?.name);
    })
    .filter((item): item is string => Boolean(item));
}

function getTemplateUsageStrategy(mode: TemplateUsageMode) {
  if (mode === "structure") {
    return {
      contract:
        "- Usa la plantilla como mapa de organizacion: orden, secciones, nivel de detalle y jerarquia.\n- No imites necesariamente su tono, formulas textuales ni longitud exacta.\n- Si el tipo documental seleccionado exige otra estructura, adapta el esqueleto sin forzarlo.",
      structureWeight: "alto",
      toneWeight: "bajo",
      contentWeight: "nulo salvo orientacion abstracta",
      adaptationRules:
        "- Replica la logica de apartados, no las frases.\n- Mantiene el numero aproximado de bloques solo si mejora la claridad.\n- Convierte secciones de la plantilla en apartados adecuados al tipo elegido.\n- Omite secciones que no encajen con los datos del formulario.",
    };
  }

  if (mode === "tone") {
    return {
      contract:
        "- Usa la plantilla como referencia de voz: formalidad, ritmo, claridad, densidad y forma de expresarse.\n- No repliques su estructura exacta ni el orden de apartados.\n- Prioriza la estructura natural del tipo documental seleccionado.",
      structureWeight: "bajo",
      toneWeight: "alto",
      contentWeight: "nulo salvo orientacion abstracta",
      adaptationRules:
        "- Mantiene un nivel parecido de formalidad y precision.\n- Ajusta longitud de frases y estilo de cierre de forma aproximada.\n- No copies muletillas, formulas propias ni expresiones distintivas palabra por palabra.\n- No incluyas apartados de la plantilla si no son necesarios.",
    };
  }

  if (mode === "light") {
    return {
      contract:
        "- Usa la plantilla solo como contexto suave.\n- Prioriza casi por completo los datos del formulario, las reglas de DocuGen y el tipo documental.\n- Si dudas entre parecerte a la plantilla o crear un documento limpio, elige el documento limpio.",
      structureWeight: "bajo",
      toneWeight: "bajo",
      contentWeight: "nulo",
      adaptationRules:
        "- Toma solo ideas generales de organizacion o tono.\n- No intentes reproducir el formato completo.\n- No mantengas expresiones, clausulas ni orden si no aportan valor.\n- Usa la plantilla para evitar genericidad, no para copiar estilo.",
    };
  }

  return {
    contract:
      "- Usa la plantilla como referencia fuerte de estructura y tono.\n- Conserva el tipo de orden, nivel de formalidad, profundidad y estilo general.\n- El resultado debe recordar al formato de trabajo de la plantilla, pero estar redactado desde cero con los datos del formulario.",
    structureWeight: "alto",
    toneWeight: "alto",
    contentWeight: "nulo salvo conceptos genericos",
    adaptationRules:
      "- Reproduce la arquitectura general si encaja con el tipo elegido.\n- Parafrasea completamente cualquier clausula o formula aprovechable.\n- Ajusta el nivel de detalle al documento solicitado, no a la longitud original.\n- Elimina o transforma cualquier seccion que dependa de datos no aportados.",
  };
}
