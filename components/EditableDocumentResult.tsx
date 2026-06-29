"use client";

import { useMemo, useState } from "react";
import { SaveToCatalogCard } from "@/components/SaveToCatalogCard";
import { downloadDocumentDocx } from "@/lib/docx";
import { downloadDocumentPdf, downloadDocumentTxt, type PdfBrandSettings } from "@/lib/pdf";
import type { DocumentVersionRow } from "@/lib/supabase-server";

type EditableDocumentResultProps = {
  documentId: string;
  title: string;
  initialContent: string;
  initialVersions?: DocumentVersionRow[];
  includesSignatures?: boolean;
  canExportDocx?: boolean;
  brandSettings?: PdfBrandSettings | null;
  canSaveToCatalog?: boolean;
  savedCatalogType?: { id: string; label: string } | null;
};

type SaveResponse = {
  document?: { id: string; content: string };
  versions?: DocumentVersionRow[];
  restoredFrom?: number;
  message?: string;
};

type ImproveMode = "formal" | "brief" | "commercial" | "natural" | "legal_review" | "custom";

type ImproveResponse = {
  document?: { id: string; content: string };
  modelUsed?: string | null;
  aiMode?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  message?: string;
};

type AiComparison = {
  before: string;
  after: string;
  modeLabel: string;
  aiMode: string;
  modelUsed: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
};

type PendingAiMetadata = {
  label: string;
  aiMode: string;
  modelUsed: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
};

type AssistedInstruction = {
  id: string;
  label: string;
  description: string;
  instruction: string;
};

const improveModes: Array<{ value: ImproveMode; label: string; description: string }> = [
  { value: "formal", label: "Mas formal", description: "Pulido profesional, sobrio y preciso." },
  { value: "brief", label: "Mas breve", description: "Reduce repeticiones y deja lo esencial." },
  { value: "commercial", label: "Más comercial", description: "Mejora claridad, valor y próximos pasos." },
  { value: "natural", label: "Más natural", description: "Suena más humano sin perder profesionalidad." },
  { value: "legal_review", label: "Mas prudente", description: "Refuerza claridad y cautela en documentos sensibles." },
  { value: "custom", label: "Instruccion propia", description: "Indica exactamente que quieres cambiar." },
];

const assistedInstructions: AssistedInstruction[] = [
  {
    id: "email",
    label: "Convertir en email",
    description: "Transforma el texto en asunto, saludo, cuerpo y cierre.",
    instruction:
      "Convierte el documento en un email profesional. Incluye asunto, saludo, cuerpo claro, solicitud o cierre accionable y despedida. Mantiene datos, hechos y aviso final si procede.",
  },
  {
    id: "clarity",
    label: "Hacer más claro",
    description: "Ordena ideas, mejora lectura y elimina ambigüedades.",
    instruction:
      "Reescribe el documento para que sea más claro y fácil de entender. Ordena ideas, reduce ambigüedades, mejora transiciones y conserva todos los datos importantes.",
  },
  {
    id: "conditions",
    label: "Añadir condiciones",
    description: "Refuerza condiciones, plazos, pagos o responsabilidades.",
    instruction:
      "Añade o refuerza un apartado de condiciones cuando encaje: plazos, pagos, responsabilidades, entregables, aceptación o siguientes pasos. No inventes datos; usa [PENDIENTE DE COMPLETAR] cuando falte información.",
  },
  {
    id: "executive",
    label: "Resumen ejecutivo",
    description: "Añade una apertura breve para lectura rápida.",
    instruction:
      "Añade al inicio un resumen ejecutivo breve y profesional que explique objetivo, partes implicadas y puntos clave. Mantiene el resto del documento coherente.",
  },
  {
    id: "risk",
    label: "Detectar huecos",
    description: "Marca información pendiente y puntos que conviene revisar.",
    instruction:
      "Revisa el documento para detectar información incompleta o ambigua. Integra marcadores [PENDIENTE DE COMPLETAR] donde falten datos relevantes y refuerza el aviso de revisión profesional sin dar asesoramiento legal definitivo.",
  },
  {
    id: "client",
    label: "Orientar a cliente",
    description: "Hace el texto más comercial sin perder rigor.",
    instruction:
      "Mejora el documento para que sea más orientado a cliente: más claro, convincente y accionable. No cambies condiciones, importes, fechas ni obligaciones.",
  },
];

export function EditableDocumentResult({
  documentId,
  title,
  initialContent,
  initialVersions = [],
  includesSignatures,
  canExportDocx = false,
  brandSettings,
  canSaveToCatalog = false,
  savedCatalogType = null,
}: EditableDocumentResultProps) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [versions, setVersions] = useState(initialVersions);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [versionCopiedId, setVersionCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improvingLabel, setImprovingLabel] = useState<string | null>(null);
  const [improveMode, setImproveMode] = useState<ImproveMode>("formal");
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiComparison, setAiComparison] = useState<AiComparison | null>(null);
  const [pendingAiMetadata, setPendingAiMetadata] = useState<PendingAiMetadata | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = content !== savedContent;
  const stats = useMemo(() => getDocumentStats(content), [content]);

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyVersion(version: DocumentVersionRow) {
    await navigator.clipboard.writeText(version.content);
    setVersionCopiedId(version.id);
    window.setTimeout(() => setVersionCopiedId(null), 1600);
  }

  async function saveDocument() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          changeSource: pendingAiMetadata ? "ai_improvement" : "manual",
          changeSummary: pendingAiMetadata ? `Mejora IA: ${pendingAiMetadata.label}` : undefined,
          aiMode: pendingAiMetadata?.aiMode,
          modelUsed: pendingAiMetadata?.modelUsed,
          tokensInput: pendingAiMetadata?.tokensInput,
          tokensOutput: pendingAiMetadata?.tokensOutput,
        }),
      });
      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.document) {
        setError(data.message || "No se pudo guardar el documento.");
        return;
      }

      setSavedContent(data.document.content);
      setContent(data.document.content);
      setVersions(data.versions || versions);
      setAiComparison(null);
      setPendingAiMetadata(null);
      setSaveMessage("Cambios guardados");
      window.setTimeout(() => setSaveMessage(null), 1800);
    } catch {
      setError("No se pudo guardar porque DocuGen no respondió. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function restoreVersion(version: DocumentVersionRow) {
    if (!window.confirm(`Restaurar la version ${version.version_number}? Se creara una nueva version con ese contenido.`)) {
      return;
    }

    setRestoringId(version.id);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/versions/${version.id}/restore`, { method: "POST" });
      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.document) {
        setError(data.message || "No se pudo restaurar la version.");
        return;
      }

      setSavedContent(data.document.content);
      setContent(data.document.content);
      setVersions(data.versions || versions);
      setAiComparison(null);
      setPendingAiMetadata(null);
      setEditing(false);
      setSaveMessage(`Version ${data.restoredFrom || version.version_number} restaurada`);
      window.setTimeout(() => setSaveMessage(null), 2200);
    } catch {
      setError("No se pudo restaurar la versión porque DocuGen no respondió. Inténtalo de nuevo en unos segundos.");
    } finally {
      setRestoringId(null);
    }
  }

  async function improveWithAi(instruction?: AssistedInstruction) {
    setImproving(true);
    setImprovingLabel(instruction?.label || improveModes.find((mode) => mode.value === improveMode)?.label || "Mejora IA");
    setError(null);
    setSaveMessage(null);

    const requestMode: ImproveMode = instruction ? "custom" : improveMode;
    const requestInstruction = instruction?.instruction || (improveMode === "custom" ? customInstruction : undefined);
    const modeLabel = instruction?.label || improveModes.find((mode) => mode.value === improveMode)?.label || "Mejora IA";

    try {
      const response = await fetch(`/api/documents/${documentId}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mode: requestMode,
          customInstruction: requestInstruction,
        }),
      });
      const data = (await response.json()) as ImproveResponse;

      if (!response.ok || !data.document) {
        setError(data.message || "No se pudo mejorar el documento.");
        return;
      }

      setAiComparison({
        before: content,
        after: data.document.content,
        modeLabel,
        aiMode: data.aiMode || requestMode,
        modelUsed: data.modelUsed || null,
        tokensInput: data.tokensInput ?? null,
        tokensOutput: data.tokensOutput ?? null,
      });
      setSaveMessage("Mejora lista para comparar.");
      window.setTimeout(() => setSaveMessage(null), 2600);
    } catch {
      setError("No se pudo mejorar el documento porque DocuGen no respondió. Inténtalo de nuevo en unos segundos.");
    } finally {
      setImproving(false);
      setImprovingLabel(null);
    }
  }

  function applyAiComparison() {
    if (!aiComparison) {
      return;
    }

    setContent(aiComparison.after);
    setPendingAiMetadata({
      label: aiComparison.modeLabel,
      aiMode: aiComparison.aiMode,
      modelUsed: aiComparison.modelUsed,
      tokensInput: aiComparison.tokensInput,
      tokensOutput: aiComparison.tokensOutput,
    });
    setEditing(true);
    setSaveMessage("Mejora aplicada al editor. Revisa y guarda si te encaja.");
    window.setTimeout(() => setSaveMessage(null), 3200);
  }

  function discardAiComparison() {
    setAiComparison(null);
    setSaveMessage("Mejora descartada");
    window.setTimeout(() => setSaveMessage(null), 1800);
  }

  function loadVersionInEditor(version: DocumentVersionRow) {
    setContent(version.content);
    setEditing(true);
    setAiComparison(null);
    setPendingAiMetadata(null);
    setSaveMessage(`Version ${version.version_number} cargada en el editor`);
    window.setTimeout(() => setSaveMessage(null), 2200);
  }

  return (
    <section className="grid gap-5">
      {canSaveToCatalog && <SaveToCatalogCard documentId={documentId} title={title} initialCatalogType={savedCatalogType} />}
      <div className="surface rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-4">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">Documento editable</p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Puedes ajustar el texto, guardarlo en Documentos y exportar la version final.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="focus-ring btn-primary px-3 py-2 text-sm"
            >
              {editing ? "Vista previa" : "Editar"}
            </button>
            <button
              type="button"
              onClick={() => setContent(savedContent)}
              disabled={!hasChanges}
              className="focus-ring btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={() => void saveDocument()}
              disabled={!hasChanges || saving}
              className="focus-ring btn-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void downloadDocumentPdf({ title, content, includesSignatures, brandSettings })}
              className="focus-ring btn-secondary px-3 py-2 text-sm"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() => downloadDocumentTxt(title, content)}
              className="focus-ring btn-secondary px-3 py-2 text-sm"
            >
              TXT
            </button>
            <button type="button" onClick={copyText} className="focus-ring btn-ghost px-3 py-2 text-sm">
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={() => downloadDocumentDocx({ title, content, includesSignatures, canExportDocx })}
              className={
                canExportDocx
                  ? "focus-ring btn-secondary px-3 py-2 text-sm"
                  : "focus-ring rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
              }
              title={canExportDocx ? "Descargar Word" : "Word solo esta disponible en el plan Pro"}
            >
              {canExportDocx ? "Word" : "Word Pro"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 font-semibold text-[#2d6a4f]">
            {hasChanges ? "Cambios sin guardar" : "Guardado"}
          </span>
          <span>{stats.words} palabras</span>
          <span>{stats.characters} caracteres</span>
          {versions.length > 0 && <span>{versions.length} versiones</span>}
          {saveMessage && <span className="font-semibold text-[#2d6a4f]">{saveMessage}</span>}
        </div>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {editing ? (
          <label className="mt-5 block">
            <span className="sr-only">Contenido del documento</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="focus-ring min-h-[560px] w-full rounded-md border border-[#d8f3dc] bg-[#fffdf8]/92 p-5 font-mono text-sm leading-7 text-[#1f2933]"
              spellCheck
            />
          </label>
        ) : (
          <article className="mt-5 whitespace-pre-wrap rounded-md bg-[#faf9f6] p-5 text-sm leading-7">{content}</article>
        )}
      </div>

      <aside className="surface rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">Mejorar con IA</p>
            <h3 className="mt-1 text-lg font-bold">Pulir el documento actual</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              La IA prepara una version mejorada para compararla antes de aplicarla. No se guarda hasta que pulses Guardar.
            </p>
          </div>
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">Reversible</span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr_auto] lg:items-end">
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Tipo de mejora</span>
            <select
              value={improveMode}
              onChange={(event) => setImproveMode(event.target.value as ImproveMode)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-[#fffdf8]/92 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
            >
              {improveModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Instruccion opcional</span>
            <input
              value={customInstruction}
              onChange={(event) => setCustomInstruction(event.target.value)}
              disabled={improveMode !== "custom"}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-[#fffdf8]/92 px-3 py-3 text-sm transition focus:border-[#2d6a4f] disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="Ej: hazlo más directo, cambia a tono email, elimina tecnicismos..."
            />
          </label>

          <button
            type="button"
            onClick={() => void improveWithAi()}
            disabled={improving || (improveMode === "custom" && customInstruction.trim().length < 8)}
            className="focus-ring btn-primary px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {improving ? "Mejorando..." : "Mejorar"}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {improveModes.find((mode) => mode.value === improveMode)?.description}
        </p>

        <div className="mt-5 border-t border-[#d8f3dc] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Edicion asistida</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Acciones rapidas para cambios habituales sin escribir instrucciones desde cero.
              </p>
            </div>
            {improvingLabel && <span className="text-xs font-semibold text-[#2d6a4f]">Trabajando: {improvingLabel}</span>}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {assistedInstructions.map((instruction) => (
              <button
                key={instruction.id}
                type="button"
                onClick={() => void improveWithAi(instruction)}
                disabled={improving}
                className="focus-ring rounded-md border border-[#d8f3dc] bg-[#fffdf8]/76 p-3 text-left transition hover:border-[#2d6a4f] hover:bg-[#fffdf8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm font-bold">{instruction.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{instruction.description}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {aiComparison && (
        <aside className="surface rounded-md p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#2d6a4f]">Comparacion IA</p>
              <h3 className="mt-1 text-lg font-bold">Antes y despues</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Revisa la propuesta generada con el modo {aiComparison.modeLabel}. Puedes aplicarla al editor o descartarla.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={discardAiComparison} className="focus-ring btn-secondary px-3 py-2 text-sm">
                Descartar
              </button>
              <button type="button" onClick={applyAiComparison} className="focus-ring btn-primary px-3 py-2 text-sm">
                Aplicar al editor
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ComparisonPanel title="Antes" content={aiComparison.before} tone="muted" />
            <ComparisonPanel title="Despues" content={aiComparison.after} tone="highlight" />
          </div>
        </aside>
      )}

      <aside className="surface rounded-md p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">Versiones</p>
            <h3 className="mt-1 text-lg font-bold">Versiones</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Abre una version para revisarla, copiarla o cargarla en el editor antes de restaurarla.
            </p>
          </div>
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
            {versions.length || "Sin"} versiones
          </span>
        </div>

        {versions.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-[#d8f3dc] bg-[#fffdf8]/72 p-4 text-sm text-slate-600">
            Aún no hay versiones guardadas. Edita el documento y pulsa Guardar para crear la primera.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {versions.map((version) => {
              const versionStats = getDocumentStats(version.content);
              const isCurrent = version.content === savedContent;

              return (
                <details key={version.id} className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/76">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Version {version.version_number}
                        {isCurrent && <span className="ml-2 text-xs text-[#2d6a4f]">Actual</span>}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {version.change_summary || "Cambio manual"} · {formatVersionDate(version.created_at)} ·{" "}
                        {versionStats.words} palabras
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Origen: {getVersionSourceLabel(version)}
                        {version.model_used ? ` · Modelo: ${version.model_used}` : ""}
                        {version.tokens_input || version.tokens_output
                          ? ` · Tokens: ${(version.tokens_input || 0) + (version.tokens_output || 0)}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Ver</span>
                  </summary>

                  <div className="border-t border-[#d8f3dc] p-3">
                    <article className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-[#faf9f6] p-4 text-sm leading-7">
                      {version.content}
                    </article>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyVersion(version)}
                        className="focus-ring btn-ghost px-3 py-2 text-sm"
                      >
                        {versionCopiedId === version.id ? "Copiada" : "Copiar version"}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadVersionInEditor(version)}
                        disabled={version.content === content}
                        className="focus-ring btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cargar en editor
                      </button>
                      <button
                        type="button"
                        onClick={() => void restoreVersion(version)}
                        disabled={restoringId === version.id || isCurrent}
                        className="focus-ring btn-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {restoringId === version.id ? "Restaurando..." : "Restaurar como actual"}
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </aside>
    </section>
  );
}

function ComparisonPanel({ title, content, tone }: { title: string; content: string; tone: "muted" | "highlight" }) {
  const stats = getDocumentStats(content);
  const toneClass =
    tone === "highlight"
      ? "border-[#2d6a4f] bg-[#f4fbf5]"
      : "border-slate-200 bg-[#fffdf8]/76";

  return (
    <div className={`rounded-md border ${toneClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-inherit px-4 py-3">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-slate-500">
          {stats.words} palabras · {stats.characters} caracteres
        </p>
      </div>
      <article className="max-h-[520px] overflow-auto whitespace-pre-wrap p-4 text-sm leading-7">{content}</article>
    </div>
  );
}

function getDocumentStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return {
    words,
    characters: content.length,
  };
}

function formatVersionDate(value: string) {
  const date = new Date(value);

  return `${date.toLocaleDateString("es-ES")} ${date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getVersionSourceLabel(version: DocumentVersionRow) {
  if (version.change_source === "original") {
    return "Original";
  }

  if (version.change_source === "ai_improvement") {
    return version.ai_mode ? `Mejora IA (${version.ai_mode})` : "Mejora IA";
  }

  if (version.change_source === "restored") {
    return "Restauracion";
  }

  return "Edicion manual";
}
