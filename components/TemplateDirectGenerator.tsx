"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DocResult, type DocumentTemplateTrace } from "@/components/DocResult";
import type { PdfBrandSettings } from "@/lib/pdf";
import type { EditableTemplateVariable } from "@/lib/template-variables";
import { variableKey } from "@/lib/template-variables";

type TemplateDirectGeneratorProps = {
  templateId: string;
  templateName: string;
  templateCategory: string | null;
  templateSummary: string | null;
  variables: EditableTemplateVariable[];
  canExportDocx: boolean;
  brandSettings?: PdfBrandSettings | null;
};

type GeneratedTemplateDocument = {
  id: string;
  docType: string;
  docLabel: string;
  content: string;
  templateTrace: DocumentTemplateTrace;
};

type ApiError = {
  message?: string;
};

export function TemplateDirectGenerator({
  templateId,
  templateName,
  templateCategory,
  templateSummary,
  variables,
  canExportDocx,
  brandSettings = null,
}: TemplateDirectGeneratorProps) {
  const fields = useMemo(() => buildFields(variables), [variables]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, ""])),
  );
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedTemplateDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function generateDocument() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, extraInstructions }),
      });
      const payload = (await response.json()) as Partial<GeneratedTemplateDocument> & ApiError;

      if (!response.ok || !payload.id || !payload.content || !payload.docLabel || !payload.docType || !payload.templateTrace) {
        setError(payload.message || "No se pudo generar el documento.");
        return;
      }

      setGeneratedDocument({
        id: payload.id,
        docType: payload.docType,
        docLabel: payload.docLabel,
        content: payload.content,
        templateTrace: payload.templateTrace,
      });
    } catch {
      setError("No se pudo generar desde la plantilla porque DocuGen no respondió. Inténtalo de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="surface p-6">
        <p className="eyebrow">Datos del nuevo documento</p>
        <h2 className="panel-title mt-3">Completa lo que debe cambiar</h2>
        <p className="body-muted mt-3">
          Rellena los campos detectados en tu plantilla. DocuGen generará un documento nuevo siguiendo su estructura y
          estilo, sin copiar datos concretos del archivo original.
        </p>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <InfoPill label="Modelo" value={templateName} />
          <InfoPill label="Categoría" value={templateCategory || "Sin categoría"} />
          <InfoPill label="Resumen" value={templateSummary || "Sin resumen extraído"} />
          <InfoPill label="Variables" value={`${fields.length} campos`} />
        </div>

        <div className="status-note mt-5">
          La plantilla marca el formato. Tus respuestas mandan sobre el contenido. Si un dato no aplica, puedes dejarlo
          vacío y DocuGen usará [PENDIENTE DE COMPLETAR].
        </div>

        <div className="mt-6 grid gap-4">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="text-sm font-bold">{field.label}</span>
              <textarea
                value={values[field.key] || ""}
                onChange={(event) => updateValue(field.key, event.target.value)}
                className="field-control mt-2 min-h-20"
                placeholder={`Valor para ${field.label}`}
              />
            </label>
          ))}

          <label className="block">
            <span className="text-sm font-bold">Instrucciones adicionales</span>
            <textarea
              value={extraInstructions}
              onChange={(event) => setExtraInstructions(event.target.value)}
              className="field-control mt-2 min-h-24"
              placeholder="Ej.: hacerlo más breve, mantener tratamiento de usted, adaptar a cliente pyme..."
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateDocument}
              disabled={loading}
              className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60"
            >
              {loading ? "Generando..." : "Generar documento"}
            </button>
            <Link href={`/plantillas/${templateId}`} className="focus-ring btn-secondary px-5 py-3 text-sm">
              Volver a plantilla
            </Link>
          </div>

          {error && <p className="status-error">{error}</p>}
        </div>
      </section>

      <div>
        {generatedDocument ? (
          <DocResult
            documentId={generatedDocument.id}
            docType={generatedDocument.docType}
            title={generatedDocument.docLabel}
            content={generatedDocument.content}
            canExportDocx={canExportDocx}
            brandSettings={brandSettings}
            templateTrace={generatedDocument.templateTrace}
            onRegenerate={generateDocument}
          />
        ) : (
          <section className="surface p-6">
            <p className="eyebrow">Resultado</p>
            <h2 className="panel-title mt-3">Documento basado en tu modelo</h2>
            <p className="body-muted mt-3">
              Cuando generes, el resultado aparecerá aquí y quedará guardado automáticamente en Documentos.
            </p>
            <div className="mt-5 grid gap-3">
              <PreviewStep title="1. Respeta la plantilla" text="Se conserva la estructura útil, el orden y el tono general." />
              <PreviewStep title="2. Sustituye los datos" text="Tus campos reemplazan la información concreta del archivo original." />
              <PreviewStep title="3. Guarda el borrador" text="El documento final se añade al historial con trazabilidad de plantilla." />
            </div>
            <div className="status-note mt-5">
              La plantilla será la referencia principal. Los campos que rellenes aquí tendrán prioridad sobre cualquier
              dato del documento original.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function buildFields(variables: EditableTemplateVariable[]) {
  const source = variables.length > 0 ? variables : [{ name: "Datos principales", source: "manual", confidence: "manual" } as const];
  const usedKeys = new Set<string>();

  return source.map((variable) => {
    const baseKey = variableKey(variable.name);
    let key = baseKey;
    let suffix = 2;

    while (usedKeys.has(key)) {
      key = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    usedKeys.add(key);

    return {
      key,
      label: variable.name,
    };
  });
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function PreviewStep({ title, text }: { title: string; text: string }) {
  return (
    <article className="surface-flat interactive-subtle p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="body-muted mt-2 text-xs">{text}</p>
    </article>
  );
}
