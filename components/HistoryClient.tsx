"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { downloadDocumentDocx } from "@/lib/docx";
import { downloadDocumentPdf, downloadDocumentTxt } from "@/lib/pdf";
import { getDocumentConfig } from "@/lib/document-types";
import type { DocumentRow } from "@/lib/supabase-server";

type HistoryClientProps = {
  documents: DocumentRow[];
  canExportDocx: boolean;
};

type GenerateResponse = {
  id?: string;
  message?: string;
};

export function HistoryClient({ documents, canExportDocx }: HistoryClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groupedByMonth = useMemo(() => groupDocumentsByMonth(documents), [documents]);

  async function deleteDocument(id: string) {
    if (!window.confirm("¿Borrar este documento del historial?")) {
      return;
    }

    setBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo borrar el documento.");
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusyId(null);
    }
  }

  async function clearHistory() {
    if (!window.confirm("¿Borrar todo tu historial? Esta acción no se puede deshacer.")) {
      return;
    }

    setBusyId("all");
    setError(null);

    try {
      const response = await fetch("/api/documents/clear", { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo borrar el historial.");
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate(doc: DocumentRow) {
    setBusyId(doc.id);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: doc.doc_type, formData: doc.form_data }),
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !payload.id) {
        setError(payload.message || "No se pudo regenerar el documento.");
        return;
      }

      router.push(`/historial/${payload.id}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) {
    return <div className="surface rounded-md p-6 text-sm text-slate-600">Aún no hay documentos en tu historial.</div>;
  }

  return (
    <div className="grid gap-5">
      <div className="surface rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{documents.length} documentos guardados</p>
          <p className="mt-1 text-xs text-slate-500">El historial se muestra plegado para que puedas escanearlo rápido.</p>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={busyId === "all"}
          className="focus-ring rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {busyId === "all" ? "Borrando..." : "Borrar todo"}
        </button>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {groupedByMonth.map((group) => (
        <section key={group.label} className="grid gap-3">
          <h2 className="eyebrow">{group.label}</h2>
          {group.documents.map((doc) => {
            const config = getDocumentConfig(doc.doc_type);
            const createdAt = new Date(doc.created_at);
            const preview = doc.content.length > 900 ? `${doc.content.slice(0, 900)}...` : doc.content;
            const isBusy = busyId === doc.id;

            return (
              <details key={doc.id} className="surface-flat interactive group rounded-md">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{doc.doc_label}</h3>
                      <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-semibold text-[#1f2933]">
                        {config?.category || "Documento"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Creado el {createdAt.toLocaleDateString("es-ES")} a las{" "}
                      {createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#2d6a4f] group-open:hidden">Desplegar</span>
                  <span className="hidden text-sm font-semibold text-[#2d6a4f] group-open:inline">Plegar</span>
                </summary>

                <div className="border-t border-[#d8f3dc] p-4">
                  <article className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-[#faf9f6] p-4 text-sm leading-7">
                    {preview}
                  </article>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/historial/${doc.id}`} className="focus-ring btn-primary px-3 py-2 text-sm">
                      Ver detalle
                    </Link>
                    <Link href={`/generar?templateId=${doc.id}`} className="focus-ring btn-secondary px-3 py-2 text-sm">
                      Usar como plantilla
                    </Link>
                    <button
                      type="button"
                      onClick={() => regenerate(doc)}
                      disabled={isBusy}
                      className="focus-ring btn-ghost px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {isBusy ? "Regenerando..." : "Regenerar"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocumentPdf({
                          title: doc.doc_label,
                          content: doc.content,
                          includesSignatures: config?.includesSignatures,
                        })
                      }
                      className="focus-ring btn-ghost px-3 py-2 text-sm"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocumentTxt(doc.doc_label, doc.content)}
                      className="focus-ring btn-ghost px-3 py-2 text-sm"
                    >
                      TXT
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadDocumentDocx({
                          title: doc.doc_label,
                          content: doc.content,
                          includesSignatures: config?.includesSignatures,
                          canExportDocx,
                        })
                      }
                      className={
                        canExportDocx
                          ? "focus-ring btn-ghost px-3 py-2 text-sm"
                          : "focus-ring rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
                      }
                      title={canExportDocx ? "Descargar Word" : "Word solo está disponible en el plan Pro"}
                    >
                      {canExportDocx ? "Word" : "Word Pro"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDocument(doc.id)}
                      disabled={isBusy}
                      className="focus-ring rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {isBusy ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function groupDocumentsByMonth(documents: DocumentRow[]) {
  const formatter = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
  const groups = new Map<string, DocumentRow[]>();

  for (const doc of documents) {
    const label = formatter.format(new Date(doc.created_at));
    groups.set(label, [...(groups.get(label) || []), doc]);
  }

  return Array.from(groups.entries()).map(([label, groupedDocuments]) => ({
    label,
    documents: groupedDocuments,
  }));
}
