"use client";

import { useMemo, useState } from "react";
import { downloadDocumentDocx } from "@/lib/docx";
import { downloadDocumentPdf, downloadDocumentTxt, type PdfBrandSettings } from "@/lib/pdf";

type EditableDocumentResultProps = {
  documentId: string;
  title: string;
  initialContent: string;
  includesSignatures?: boolean;
  canExportDocx?: boolean;
  brandSettings?: PdfBrandSettings | null;
};

export function EditableDocumentResult({
  documentId,
  title,
  initialContent,
  includesSignatures,
  canExportDocx = false,
  brandSettings,
}: EditableDocumentResultProps) {
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = content !== savedContent;
  const stats = useMemo(() => getDocumentStats(content), [content]);

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function saveDocument() {
    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { document?: { content: string }; message?: string };

      if (!response.ok || !data.document) {
        setError(data.message || "No se pudo guardar el documento.");
        return;
      }

      setSavedContent(data.document.content);
      setContent(data.document.content);
      setSaveMessage("Cambios guardados");
      window.setTimeout(() => setSaveMessage(null), 1800);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface rounded-md p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-4">
        <div>
          <p className="text-sm font-semibold text-[#2d6a4f]">Documento editable</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Puedes ajustar el texto, guardarlo en tu historial y exportar la versión final.
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
            title={canExportDocx ? "Descargar Word" : "Word solo está disponible en el plan Pro"}
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
        {saveMessage && <span className="font-semibold text-[#2d6a4f]">{saveMessage}</span>}
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {editing ? (
        <label className="mt-5 block">
          <span className="sr-only">Contenido del documento</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="focus-ring min-h-[560px] w-full rounded-md border border-[#d8f3dc] bg-white/90 p-5 font-mono text-sm leading-7 text-[#1f2933]"
            spellCheck
          />
        </label>
      ) : (
        <article className="mt-5 whitespace-pre-wrap rounded-md bg-[#faf9f6] p-5 text-sm leading-7">{content}</article>
      )}
    </section>
  );
}

function getDocumentStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return {
    words,
    characters: content.length,
  };
}
