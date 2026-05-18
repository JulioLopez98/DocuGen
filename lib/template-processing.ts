import JSZip from "jszip";

export type TemplateProcessingResult = {
  text: string | null;
  summary: string | null;
  status: "ready" | "failed";
  errorMessage: string | null;
  metadata: Record<string, unknown>;
};

type TemplateSection = {
  title: string;
  snippet: string;
};

type TemplateClause = {
  title: string;
  snippet: string;
};

type TemplateVariable = {
  name: string;
  source: "placeholder" | "label";
  confidence: "high" | "medium";
};

type TemplateQuality = {
  score: number;
  warnings: string[];
};

export async function processTemplateFile(fileType: string, file: ArrayBuffer): Promise<TemplateProcessingResult> {
  if (fileType === "docx") {
    return processDocxTemplate(file);
  }

  return {
    text: null,
    summary: null,
    status: "failed",
    errorMessage:
      fileType === "pdf"
        ? "La extraccion automatica de PDF quedara disponible en una fase posterior."
        : "La extraccion automatica de DOC antiguo no esta disponible. Sube un archivo DOCX si es posible.",
    metadata: {
      processor: "docugen-deep-v1",
      fileType,
      supported: false,
    },
  };
}

async function processDocxTemplate(file: ArrayBuffer): Promise<TemplateProcessingResult> {
  try {
    const zip = await JSZip.loadAsync(file);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    if (!documentXml) {
      return {
        text: null,
        summary: null,
        status: "failed",
        errorMessage: "No se encontro el contenido principal del DOCX.",
        metadata: {
          processor: "docugen-deep-v1",
          fileType: "docx",
          supported: true,
        },
      };
    }

    const paragraphs = extractParagraphsFromDocumentXml(documentXml);
    const text = paragraphs.join("\n").trim();

    if (!text.trim()) {
      return {
        text: null,
        summary: null,
        status: "failed",
        errorMessage: "No se pudo extraer texto legible del DOCX.",
        metadata: {
          processor: "docugen-deep-v1",
          fileType: "docx",
          supported: true,
        },
      };
    }

    const analysis = analyzeTemplateText(text, paragraphs);

    return {
      text,
      summary: buildDeepSummary(analysis, text),
      status: "ready",
      errorMessage: null,
      metadata: {
        processor: "docugen-deep-v1",
        fileType: "docx",
        supported: true,
        characters: text.length,
        words: countWords(text),
        paragraphs: paragraphs.length,
        ...analysis,
      },
    };
  } catch (error) {
    console.error("docx_template_processing_error", error);

    return {
      text: null,
      summary: null,
      status: "failed",
      errorMessage: "No se pudo procesar el archivo DOCX.",
      metadata: {
        processor: "docugen-deep-v1",
        fileType: "docx",
        supported: true,
      },
    };
  }
}

function extractParagraphsFromDocumentXml(xml: string) {
  return xml
    .split(/<\/w:p>/g)
    .map((paragraphXml) => extractTextFromXmlFragment(paragraphXml))
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractTextFromXmlFragment(xml: string) {
  return decodeXmlEntities(
    xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
      .replace(/<[^>]+>/g, ""),
  );
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function analyzeTemplateText(text: string, paragraphs: string[]) {
  const sections = extractSections(paragraphs);
  const clauses = extractClauses(paragraphs);
  const variables = extractVariables(text, paragraphs);
  const tone = inferTone(text);
  const suggestedCategory = inferCategory(text);
  const sensitiveSignals = detectSensitiveSignals(text);
  const quality = assessTemplateQuality(text, paragraphs, sections, variables, sensitiveSignals);

  return {
    suggestedCategory,
    tone,
    sections,
    clauses,
    variables,
    sensitiveSignals,
    quality,
    styleNotes: buildStyleNotes(text, paragraphs, tone),
  };
}

function buildDeepSummary(analysis: ReturnType<typeof analyzeTemplateText>, text: string) {
  const bits = [
    `${analysis.suggestedCategory} con tono ${analysis.tone.label.toLowerCase()}`,
    `${analysis.sections.length} secciones detectadas`,
    `${analysis.variables.length} posibles variables`,
  ];

  if (analysis.clauses.length > 0) {
    bits.push(`${analysis.clauses.length} clausulas o bloques reutilizables`);
  }

  if (analysis.sensitiveSignals.length > 0) {
    bits.push("incluye datos concretos que no deben copiarse");
  }

  const base = bits.join(". ");
  const normalized = text.replace(/\s+/g, " ").trim();
  const sample = normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trim()}...`;

  return `${base}. Muestra: ${sample}`;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractSections(paragraphs: string[]): TemplateSection[] {
  const sections: TemplateSection[] = [];

  paragraphs.forEach((paragraph, index) => {
    if (!isLikelySectionTitle(paragraph)) {
      return;
    }

    const snippet = paragraphs
      .slice(index + 1, index + 4)
      .filter((candidate) => !isLikelySectionTitle(candidate))
      .join(" ")
      .slice(0, 260);

    sections.push({
      title: cleanTitle(paragraph),
      snippet: snippet || "Sin texto descriptivo detectado.",
    });
  });

  return dedupeByTitle(sections).slice(0, 14);
}

function extractClauses(paragraphs: string[]): TemplateClause[] {
  const clauseKeywords = [
    "clausula",
    "objeto",
    "obligaciones",
    "confidencialidad",
    "duracion",
    "precio",
    "pago",
    "responsabilidad",
    "jurisdiccion",
    "proteccion de datos",
    "propiedad intelectual",
    "resolucion",
  ];

  return paragraphs
    .filter((paragraph) => {
      const normalized = normalizeForMatch(paragraph);
      return (
        /^(\d+[\).\s-]+|[ivx]+[\).\s-]+)/i.test(paragraph.trim()) ||
        clauseKeywords.some((keyword) => normalized.includes(keyword))
      );
    })
    .map((paragraph) => ({
      title: cleanTitle(paragraph).slice(0, 90),
      snippet: paragraph.slice(0, 300),
    }))
    .slice(0, 12);
}

function extractVariables(text: string, paragraphs: string[]): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const placeholderMatches = text.match(/\[[^\]]{2,80}\]|\{\{[^}]{2,80}\}\}|\{[^}]{2,80}\}/g) || [];

  placeholderMatches.forEach((match) => {
    variables.push({
      name: cleanVariableName(match),
      source: "placeholder",
      confidence: "high",
    });
  });

  paragraphs.forEach((paragraph) => {
    const match = paragraph.match(/^([A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ /_.-]{3,45})\s*:\s*(.{1,120})$/);

    if (!match) {
      return;
    }

    const label = match[1].trim();

    if (label.length > 2 && !label.includes(".")) {
      variables.push({
        name: label,
        source: "label",
        confidence: "medium",
      });
    }
  });

  return dedupeVariables(variables).slice(0, 24);
}

function inferTone(text: string) {
  const normalized = normalizeForMatch(text);
  const scores = [
    {
      label: "Formal juridico",
      score: scoreKeywords(normalized, ["clausula", "partes", "jurisdiccion", "obligaciones", "responsabilidad", "contrato"]),
    },
    {
      label: "Comercial consultivo",
      score: scoreKeywords(normalized, ["propuesta", "cliente", "alcance", "entregables", "inversion", "valor", "solucion"]),
    },
    {
      label: "Laboral prudente",
      score: scoreKeywords(normalized, ["trabajador", "empresa", "jornada", "salario", "puesto", "convenio", "baja voluntaria"]),
    },
    {
      label: "Administrativo claro",
      score: scoreKeywords(normalized, ["autorizo", "solicito", "certificado", "documentacion", "tramite", "entidad"]),
    },
    {
      label: "Natural profesional",
      score: scoreKeywords(normalized, ["estimado", "agradezco", "quedo", "saludo", "interes", "motivacion"]),
    },
  ].sort((first, second) => second.score - first.score);

  const winner = scores[0];

  return {
    label: winner.score > 0 ? winner.label : "Profesional neutro",
    confidence: winner.score >= 4 ? "alta" : winner.score >= 2 ? "media" : "baja",
  };
}

function inferCategory(text: string) {
  const normalized = normalizeForMatch(text);
  const categoryScores = [
    ["Legal", ["contrato", "acuerdo", "clausula", "confidencialidad", "jurisdiccion", "responsabilidad"]],
    ["Comercial", ["presupuesto", "propuesta", "cliente", "entregables", "inversion", "condiciones de pago"]],
    ["Laboral", ["trabajador", "empresa", "jornada", "salario", "puesto", "convenio"]],
    ["Web", ["web", "cookies", "privacidad", "datos personales", "usuario", "responsable del tratamiento"]],
    ["Administrativo", ["autorizo", "solicito", "certificado", "documentacion", "ayuntamiento", "entidad"]],
    ["Profesional", ["carta", "estimado", "cv", "experiencia", "motivacion", "saludo"]],
  ] as const;

  const [category] = [...categoryScores].sort(
    (first, second) => scoreKeywords(normalized, second[1]) - scoreKeywords(normalized, first[1]),
  )[0];

  return category;
}

function detectSensitiveSignals(text: string) {
  const signals = [
    { label: "Emails", found: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) },
    { label: "NIF/CIF", found: /\b[ABCDEFGHJKLMNPQRSUVW]?\d{7,8}[A-Z]\b/i.test(text) },
    { label: "Telefonos", found: /(?:\+34\s?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/.test(text) },
    { label: "Importes", found: /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s?(?:EUR|€|euros?)\b/i.test(text) },
    { label: "Fechas", found: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4}\b/i.test(text) },
    { label: "Cuentas bancarias", found: /\bES\d{2}\s?\d{4}\s?\d{4}\s?\d{2}\s?\d{10}\b/i.test(text) },
  ];

  return signals.filter((signal) => signal.found).map((signal) => signal.label);
}

function assessTemplateQuality(
  text: string,
  paragraphs: string[],
  sections: TemplateSection[],
  variables: TemplateVariable[],
  sensitiveSignals: string[],
): TemplateQuality {
  const warnings: string[] = [];

  if (countWords(text) < 80) {
    warnings.push("Texto muy breve: puede aportar poca referencia.");
  }

  if (sections.length < 2) {
    warnings.push("Pocas secciones detectadas.");
  }

  if (variables.length === 0) {
    warnings.push("No se han detectado variables claras.");
  }

  if (sensitiveSignals.length > 0) {
    warnings.push("Contiene datos concretos: deben usarse solo como referencia abstracta.");
  }

  if (paragraphs.some((paragraph) => paragraph.length > 1200)) {
    warnings.push("Hay parrafos muy largos que pueden dificultar la reutilizacion.");
  }

  const score = Math.max(35, 100 - warnings.length * 14);

  return { score, warnings };
}

function buildStyleNotes(text: string, paragraphs: string[], tone: ReturnType<typeof inferTone>) {
  const averageParagraphLength = paragraphs.length
    ? Math.round(paragraphs.reduce((total, paragraph) => total + paragraph.length, 0) / paragraphs.length)
    : 0;
  const hasNumberedStructure = paragraphs.some((paragraph) => /^(\d+[\).\s-]+|[ivx]+[\).\s-]+)/i.test(paragraph.trim()));
  const hasSignatures = /firma|firmado|en prueba de conformidad/i.test(text);

  return {
    tone: tone.label,
    averageParagraphLength,
    numberedStructure: hasNumberedStructure,
    signatures: hasSignatures,
  };
}

function isLikelySectionTitle(paragraph: string) {
  const clean = paragraph.trim();

  if (clean.length < 3 || clean.length > 120) {
    return false;
  }

  if (/^(\d+[\).\s-]+|[ivx]+[\).\s-]+)/i.test(clean)) {
    return true;
  }

  const letters = clean.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  const uppercase = letters.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, "");
  const uppercaseRatio = letters.length ? uppercase.length / letters.length : 0;

  return uppercaseRatio > 0.65 || /^[A-ZÁÉÍÓÚÜÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s/.-]+$/.test(clean);
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").replace(/[:.-]+$/g, "").trim();
}

function cleanVariableName(value: string) {
  return value.replace(/^[{[]+|[\]}]+$/g, "").replace(/\s+/g, " ").trim();
}

function dedupeByTitle(sections: TemplateSection[]) {
  const seen = new Set<string>();

  return sections.filter((section) => {
    const key = normalizeForMatch(section.title);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeVariables(variables: TemplateVariable[]) {
  const seen = new Set<string>();

  return variables.filter((variable) => {
    const key = normalizeForMatch(variable.name);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreKeywords(text: string, keywords: readonly string[]) {
  return keywords.reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);
}
