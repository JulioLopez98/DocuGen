"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type EditableTemplateVariable = {
  name: string;
  source: "placeholder" | "label" | "manual";
  confidence: "high" | "medium" | "manual";
};

type TemplateVariablesEditorProps = {
  templateId: string;
  initialVariables: EditableTemplateVariable[];
};

type ApiError = {
  message?: string;
};

const emptyVariable: EditableTemplateVariable = {
  name: "",
  source: "manual",
  confidence: "manual",
};

export function TemplateVariablesEditor({ templateId, initialVariables }: TemplateVariablesEditorProps) {
  const router = useRouter();
  const [variables, setVariables] = useState<EditableTemplateVariable[]>(
    initialVariables.length > 0 ? initialVariables : [{ ...emptyVariable }],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanVariables = useMemo(
    () =>
      variables
        .map((variable) => ({ ...variable, name: variable.name.trim() }))
        .filter((variable) => variable.name.length > 0),
    [variables],
  );

  function updateVariable(index: number, name: string) {
    setVariables((current) => current.map((variable, itemIndex) => (itemIndex === index ? { ...variable, name } : variable)));
  }

  function removeVariable(index: number) {
    setVariables((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [{ ...emptyVariable }];
    });
  }

  async function saveVariables() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variables: cleanVariables }),
      });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudieron guardar las variables.");
        return;
      }

      setMessage("Variables guardadas correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Variables</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Revisa los campos reutilizables detectados. En la siguiente fase serviran para crear documentos desde una
            plantilla concreta.
          </p>
        </div>
        <span className="rounded-full bg-[#faf9f6] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
          {cleanVariables.length} activas
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {variables.map((variable, index) => (
          <div key={`${variable.source}-${index}`} className="grid gap-2 rounded-md bg-[#faf9f6] p-3 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="sr-only">Nombre de variable</span>
              <input
                value={variable.name}
                onChange={(event) => updateVariable(index, event.target.value)}
                className="focus-ring w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Cliente, importe, fecha..."
              />
              <span className="mt-1 block text-xs text-slate-500">
                {getVariableSourceLabel(variable.source)} · {getConfidenceLabel(variable.confidence)}
              </span>
            </label>
            <button
              type="button"
              onClick={() => removeVariable(index)}
              className="focus-ring rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setVariables((current) => [...current, { ...emptyVariable }])}
          className="focus-ring btn-secondary px-4 py-2 text-sm"
        >
          Anadir variable
        </button>
        <button
          type="button"
          onClick={saveVariables}
          disabled={saving}
          className="focus-ring btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar variables"}
        </button>
      </div>

      {message && <p className="mt-3 rounded-md bg-[#d8f3dc] p-3 text-sm text-[#1f2933]">{message}</p>}
      {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function getVariableSourceLabel(source: EditableTemplateVariable["source"]) {
  const labels: Record<EditableTemplateVariable["source"], string> = {
    placeholder: "Detectada por marcador",
    label: "Detectada por etiqueta",
    manual: "Manual",
  };

  return labels[source];
}

function getConfidenceLabel(confidence: EditableTemplateVariable["confidence"]) {
  const labels: Record<EditableTemplateVariable["confidence"], string> = {
    high: "confianza alta",
    medium: "confianza media",
    manual: "revisada manualmente",
  };

  return labels[confidence];
}
