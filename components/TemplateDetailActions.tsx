"use client";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { DocumentTemplateRow } from "@/lib/supabase-server";

type TemplateDetailActionsProps = {
  template: DocumentTemplateRow;
};

type ApiError = {
  message?: string;
};

export function TemplateDetailActions({ template }: TemplateDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"download" | "delete" | "process" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadOriginal() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setLoading("download");
    setError(null);

    try {
      const { data, error: downloadError } = await supabase.storage.from(template.storage_bucket).download(template.storage_path);

      if (downloadError || !data) {
        setError(downloadError?.message || "No se pudo descargar el archivo.");
        return;
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = template.original_filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo descargar el archivo.");
    } finally {
      setLoading(null);
    }
  }

  async function deleteTemplate() {
    if (!window.confirm(`¿Borrar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setLoading("delete");
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudo borrar la plantilla.");
        return;
      }

      router.push("/plantillas");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(null);
    }
  }

  async function processTemplate() {
    setLoading("process");
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}/process`, { method: "POST" });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudo procesar la plantilla.");
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(null);
    }
  }

  async function toggleFavorite() {
    setLoading("process");
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !template.is_favorite }),
      });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudo actualizar la plantilla.");
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading !== null}
        className={`focus-ring rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
          template.is_favorite
            ? "border-[#2d6a4f] bg-[#d8f3dc] text-[#1f2933]"
            : "border-[#d8f3dc] bg-white text-[#2d6a4f] hover:border-[#2d6a4f]"
        }`}
      >
        {template.is_favorite ? "Quitar de destacadas" : "Marcar como destacada"}
      </button>
      <button
        type="button"
        onClick={processTemplate}
        disabled={loading !== null}
        className="focus-ring btn-secondary px-4 py-3 text-sm disabled:opacity-60"
      >
        {loading === "process" ? "Procesando..." : template.status === "ready" ? "Procesar de nuevo" : "Procesar plantilla"}
      </button>
      <button
        type="button"
        onClick={downloadOriginal}
        disabled={loading !== null}
        className="focus-ring btn-primary px-4 py-3 text-sm disabled:opacity-60"
      >
        {loading === "download" ? "Descargando..." : "Descargar original"}
      </button>
      <button
        type="button"
        onClick={deleteTemplate}
        disabled={loading !== null}
        className="focus-ring rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        {loading === "delete" ? "Borrando..." : "Borrar plantilla"}
      </button>
      {error && <p className="status-error">{error}</p>}
    </div>
  );
}
