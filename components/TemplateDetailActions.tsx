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
  const [loading, setLoading] = useState<"download" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadOriginal() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase no esta configurado.");
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
    if (!window.confirm(`Borrar la plantilla "${template.name}"? Esta accion no se puede deshacer.`)) {
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

  return (
    <div className="grid gap-2">
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
        className="focus-ring rounded-md border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        {loading === "delete" ? "Borrando..." : "Borrar plantilla"}
      </button>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
