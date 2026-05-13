import JSZip from "jszip";

export type TemplateProcessingResult = {
  text: string | null;
  summary: string | null;
  status: "ready" | "failed";
  errorMessage: string | null;
  metadata: Record<string, unknown>;
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
      processor: "docugen-basic",
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
          processor: "docugen-basic",
          fileType: "docx",
          supported: true,
        },
      };
    }

    const text = extractTextFromDocumentXml(documentXml);

    if (!text.trim()) {
      return {
        text: null,
        summary: null,
        status: "failed",
        errorMessage: "No se pudo extraer texto legible del DOCX.",
        metadata: {
          processor: "docugen-basic",
          fileType: "docx",
          supported: true,
        },
      };
    }

    return {
      text,
      summary: buildBasicSummary(text),
      status: "ready",
      errorMessage: null,
      metadata: {
        processor: "docugen-basic",
        fileType: "docx",
        supported: true,
        characters: text.length,
        words: countWords(text),
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
        processor: "docugen-basic",
        fileType: "docx",
        supported: true,
      },
    };
  }
}

function extractTextFromDocumentXml(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildBasicSummary(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= 240) {
    return normalized;
  }

  return `${normalized.slice(0, 237).trim()}...`;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
