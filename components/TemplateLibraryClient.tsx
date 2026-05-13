"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { DocumentTemplateRow } from "@/lib/supabase-server";

const TEMPLATE_BUCKET = "document-templates";
const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const allowedExtensions = ["pdf", "docx", "doc"] as const;

type AllowedExtension = (typeof allowedExtensions)[number];

type TemplateLibraryClientProps = {
  userId: string;
  initialTemplates: DocumentTemplateRow[];
};

type ApiError = {
  message?: string;
};

export function TemplateLibraryClient({ userId, initialTemplates }: TemplateLibraryClientProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>(initialTemplates);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readyCount = useMemo(() => templates.filter((template) => template.status === "ready").length, [templates]);

  async function uploadTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Selecciona un archivo PDF o Word.");
      return;
    }

    const fileType = getFileType(file.name);

    if (!fileType) {
      setError("Formato no admitido. Usa PDF, DOCX o DOC.");
      return;
    }

    if (file.size > MAX_TEMPLATE_SIZE) {
      setError("El archivo supera el limite de 10 MB.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase no esta configurado.");
      return;
    }

    setLoading(true);

    const storagePath = `${userId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

    try {
      const { error: uploadError } = await supabase.storage.from(TEMPLATE_BUCKET).upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

      if (uploadError) {
        setError(uploadError.message || "No se pudo subir el archivo.");
        return;
      }

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || removeExtension(file.name),
          description: description.trim() || null,
          category: category.trim() || null,
          originalFilename: file.name,
          fileType,
          mimeType: file.type || null,
          fileSize: file.size,
          storagePath,
        }),
      });
      const payload = (await response.json()) as { template?: DocumentTemplateRow } & ApiError;

      if (!response.ok || !payload.template) {
        await supabase.storage.from(TEMPLATE_BUCKET).remove([storagePath]);
        setError(payload.message || "No se pudo registrar la plantilla.");
        return;
      }

      setTemplates((current) => [payload.template!, ...current]);
      setMessage("Plantilla subida correctamente.");
      setName("");
      setCategory("");
      setDescription("");
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("No se pudo completar la subida.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(template: DocumentTemplateRow) {
    if (!window.confirm(`Borrar la plantilla "${template.name}"? Esta accion no se puede deshacer.`)) {
      return;
    }

    setWorkingId(template.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const payload = (await response.json()) as ApiError;

      if (!response.ok) {
        setError(payload.message || "No se pudo borrar la plantilla.");
        return;
      }

      setTemplates((current) => current.filter((item) => item.id !== template.id));
      setMessage("Plantilla borrada correctamente.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setWorkingId(null);
    }
  }

  async function downloadOriginal(template: DocumentTemplateRow) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase no esta configurado.");
      return;
    }

    setWorkingId(template.id);
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
      setWorkingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <section className="surface rounded-md p-6">
        <p className="eyebrow">Subir plantilla</p>
        <h2 className="font-serif-display mt-3 text-3xl font-bold">Anade un documento propio</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sube Word o PDF con ejemplos, clausulas o formatos que quieras reutilizar. En esta fase queda guardado como
          referencia para el procesamiento posterior.
        </p>

        <form onSubmit={uploadTemplate} className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm font-bold">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"
              placeholder="Plantilla contrato servicios"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Categoria</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"
              placeholder="Legal, Comercial, Laboral..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Descripcion</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="focus-ring mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"
              placeholder="Para que sirve esta plantilla o que debe respetar DocuGen..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Archivo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"
            />
            <span className="mt-2 block text-xs text-slate-500">PDF, DOC o DOCX. Maximo 10 MB.</span>
          </label>

          <button type="submit" disabled={loading} className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60">
            {loading ? "Subiendo..." : "Subir plantilla"}
          </button>
        </form>

        {message && <p className="mt-4 rounded-md bg-[#d8f3dc] p-3 text-sm text-[#1f2933]">{message}</p>}
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      <section className="surface rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Tus plantillas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {templates.length === 0
                ? "Aun no has subido plantillas."
                : `${templates.length} plantillas guardadas. ${readyCount} listas para futuras generaciones con referencia.`}
            </p>
          </div>
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
            {templates.length} archivos
          </span>
        </div>

        <div className="mt-6 grid gap-3">
          {templates.length === 0 ? (
            <EmptyState
              eyebrow="Biblioteca vacia"
              title="Sube tu primera plantilla"
              description="Guarda documentos propios para que DocuGen pueda usarlos como referencia en las siguientes fases."
              variant="flat"
            />
          ) : (
            templates.map((template) => (
              <article key={template.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{template.name}</h3>
                      <StatusBadge status={template.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {template.original_filename} - {template.file_type.toUpperCase()} - {formatBytes(template.file_size)} -{" "}
                      {new Date(template.created_at).toLocaleDateString("es-ES")}
                    </p>
                    {(template.category || template.description) && (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {template.category && <strong>{template.category}: </strong>}
                        {template.description || "Sin descripcion."}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadOriginal(template)}
                      disabled={workingId === template.id}
                      className="focus-ring btn-secondary px-3 py-2 text-xs disabled:opacity-60"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(template)}
                      disabled={workingId === template.id}
                      className="focus-ring rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentTemplateRow["status"] }) {
  const labels: Record<DocumentTemplateRow["status"], string> = {
    uploaded: "Subida",
    processing: "Procesando",
    ready: "Lista",
    failed: "Error",
  };

  return <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">{labels[status]}</span>;
}

function getFileType(filename: string): AllowedExtension | null {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (allowedExtensions.includes(extension as AllowedExtension)) {
    return extension as AllowedExtension;
  }

  return null;
}

function sanitizeFilename(filename: string) {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function removeExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

function formatBytes(value: number | null) {
  if (!value) {
    return "tamano pendiente";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
