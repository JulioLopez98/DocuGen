"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PlanFirstSteps } from "@/components/PlanFirstSteps";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getTemplateQaReport, getTemplateQaStyles } from "@/lib/template-qa";
import { getTemplateUsageMetrics, type TemplateUsageMetricsMap } from "@/lib/template-metrics";
import type { DocumentTemplateRow, WorkspaceRow } from "@/lib/supabase-server";
import { templateUsageLabels } from "@/lib/template-usage";

const TEMPLATE_BUCKET = "document-templates";
const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const allowedExtensions = ["pdf", "docx", "doc"] as const;

type AllowedExtension = (typeof allowedExtensions)[number];

type TemplateLibraryClientProps = {
  userId: string;
  initialTemplates: DocumentTemplateRow[];
  initialTemplateMetrics: TemplateUsageMetricsMap;
  workspaces?: WorkspaceRow[];
  plan?: "pro" | "empresa";
};

type ApiError = {
  message?: string;
};

type UploadQueueStatus = "pending" | "uploading" | "registered" | "failed";

type UploadQueueItem = {
  id: string;
  filename: string;
  status: UploadQueueStatus;
  message: string;
};

export function TemplateLibraryClient({
  userId,
  initialTemplates,
  initialTemplateMetrics,
  workspaces = [],
  plan = "pro",
}: TemplateLibraryClientProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateRow[]>(initialTemplates);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DocumentTemplateRow["status"]>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorites">("all");

  const readyCount = useMemo(() => templates.filter((template) => template.status === "ready").length, [templates]);
  const processingCount = useMemo(() => templates.filter((template) => template.status === "processing").length, [templates]);
  const failedCount = useMemo(() => templates.filter((template) => template.status === "failed").length, [templates]);
  const favoriteCount = useMemo(() => templates.filter((template) => template.is_favorite).length, [templates]);
  const totalUses = useMemo(
    () => templates.reduce((total, template) => total + getTemplateUsageMetrics(initialTemplateMetrics, template.id).totalUses, 0),
    [templates, initialTemplateMetrics],
  );
  const categories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category).filter((category): category is string => Boolean(category)))).sort(),
    [templates],
  );
  const filteredTemplates = useMemo(
    () => filterTemplates(templates, query, statusFilter, categoryFilter, favoriteFilter),
    [templates, query, statusFilter, categoryFilter, favoriteFilter],
  );

  async function uploadTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (files.length === 0) {
      setError("Selecciona uno o varios archivos PDF o Word.");
      return;
    }

    const invalidFile = files.find((selectedFile) => !getFileType(selectedFile.name));

    if (invalidFile) {
      setError("Formato no admitido. Usa PDF, DOCX o DOC.");
      return;
    }

    const oversizedFile = files.find((selectedFile) => selectedFile.size > MAX_TEMPLATE_SIZE);

    if (oversizedFile) {
      setError(`"${oversizedFile.name}" supera el límite de 10 MB.`);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setLoading(true);
    const queueItems = files.map((selectedFile) => ({
      id: crypto.randomUUID(),
      filename: selectedFile.name,
      status: "pending" as const,
      message: "Pendiente",
    }));
    const createdTemplates: DocumentTemplateRow[] = [];
    setUploadQueue(queueItems);

    try {
      for (const [fileIndex, selectedFile] of files.entries()) {
        const queueId = queueItems[fileIndex]?.id;
        const fileType = getFileType(selectedFile.name);

        if (!queueId || !fileType) {
          continue;
        }

        updateUploadQueueItem(queueId, "uploading", "Subiendo archivo");

        const storagePath = `${userId}/${crypto.randomUUID()}-${sanitizeFilename(selectedFile.name)}`;
        const { error: uploadError } = await supabase.storage.from(TEMPLATE_BUCKET).upload(storagePath, selectedFile, {
          contentType: selectedFile.type || undefined,
          upsert: false,
        });

        if (uploadError) {
          updateUploadQueueItem(queueId, "failed", uploadError.message || "No se pudo subir el archivo.");
          continue;
        }

        const response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: getTemplateNameForFile(selectedFile.name, name, files.length),
            description: description.trim() || null,
            category: category.trim() || null,
            originalFilename: selectedFile.name,
            fileType,
            mimeType: selectedFile.type || null,
            fileSize: selectedFile.size,
            storagePath,
            workspaceId: workspaceId || null,
          }),
        });
        const payload = (await response.json()) as { template?: DocumentTemplateRow } & ApiError;

        if (!response.ok || !payload.template) {
          await supabase.storage.from(TEMPLATE_BUCKET).remove([storagePath]);
          updateUploadQueueItem(queueId, "failed", payload.message || "No se pudo registrar la plantilla.");
          continue;
        }

        createdTemplates.push(payload.template);
        updateUploadQueueItem(queueId, "registered", "Subida y registrada");
      }

      if (createdTemplates.length > 0) {
        setTemplates((current) => sortTemplates([...createdTemplates, ...current]));
        setMessage(
          createdTemplates.length === 1
            ? "Plantilla subida correctamente. Ya puedes procesarla."
            : `${createdTemplates.length} plantillas subidas correctamente. Ya puedes procesarlas.`,
        );
        setName("");
        setCategory("");
        setDescription("");
        setFiles([]);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError("No se pudo subir ninguna plantilla. Revisa el detalle de cada archivo.");
      }
    } catch {
      setError("No se pudo completar la subida.");
    } finally {
      setLoading(false);
    }
  }

  function updateUploadQueueItem(id: string, status: UploadQueueStatus, itemMessage: string) {
    setUploadQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, status, message: itemMessage } : item)),
    );
  }

  async function deleteTemplate(template: DocumentTemplateRow) {
    if (!window.confirm(`¿Borrar la plantilla "${template.name}"? Esta acción no se puede deshacer.`)) {
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
      setError("Supabase no está configurado.");
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

  async function processTemplate(template: DocumentTemplateRow) {
    setWorkingId(template.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}/process`, { method: "POST" });
      const payload = (await response.json()) as { template?: DocumentTemplateRow } & ApiError;

      if (!response.ok || !payload.template) {
        setError(payload.message || "No se pudo procesar la plantilla.");
        return;
      }

      setTemplates((current) => current.map((item) => (item.id === template.id ? payload.template! : item)));
      setMessage("Plantilla procesada correctamente.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setWorkingId(null);
    }
  }

  async function toggleFavorite(template: DocumentTemplateRow) {
    setWorkingId(template.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !template.is_favorite }),
      });
      const payload = (await response.json()) as { template?: DocumentTemplateRow } & ApiError;

      if (!response.ok || !payload.template) {
        setError(payload.message || "No se pudo actualizar la plantilla.");
        return;
      }

      setTemplates((current) =>
        sortTemplates(current.map((item) => (item.id === template.id ? payload.template! : item))),
      );
      setMessage(payload.template.is_favorite ? "Plantilla marcada como destacada." : "Plantilla quitada de destacadas.");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-5">
        <LibraryMetric label="Total" value={templates.length.toString()} helper="Plantillas subidas" />
        <LibraryMetric label="Destacadas" value={favoriteCount.toString()} helper="Acceso rápido" />
        <LibraryMetric label="Listas" value={readyCount.toString()} helper="Pueden usarse como referencia" />
        <LibraryMetric label="Usos" value={totalUses.toString()} helper="Generaciones con plantilla" />
        <LibraryMetric label="Revisar" value={(processingCount + failedCount).toString()} helper="Procesando o con error" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <section className="surface p-6">
        <p className="eyebrow">Subir plantilla</p>
        <h2 className="panel-title mt-3">Añade documentos propios</h2>
        <p className="body-muted mt-3">
          Sube uno o varios Word/PDF con ejemplos, cláusulas o formatos que quieras reutilizar. Cada archivo queda
          guardado como plantilla independiente y después puedes procesarlo.
        </p>

        <form onSubmit={uploadTemplate} className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm font-bold">Nombre base opcional</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field-control mt-2"
              placeholder="Plantilla contrato servicios"
            />
            <span className="mt-2 block text-xs text-slate-500">
              Si subes varios archivos, usaremos el nombre del archivo salvo que quieras aplicar un prefijo común.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-bold">Categoría</span>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="field-control mt-2"
              placeholder="Legal, Comercial, Laboral..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Descripción</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="field-control mt-2 min-h-24"
              placeholder="Para qué sirve esta plantilla o qué debe respetar DocuGen..."
            />
          </label>

          {workspaces.length > 0 && (
            <label className="block">
              <span className="text-sm font-bold">Guardar en</span>
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="field-control mt-2"
              >
                <option value="">Biblioteca personal</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-slate-500">
                Las plantillas de equipo podrán usarlas otros miembros como referencia.
              </span>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-bold">Archivos</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              className="field-control mt-2"
            />
            <span className="mt-2 block text-xs text-slate-500">
              PDF, DOC o DOCX. Máximo 10 MB por archivo. Seleccionados: {files.length}.
            </span>
          </label>

          <button type="submit" disabled={loading} className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60">
            {loading ? "Subiendo..." : files.length > 1 ? `Subir ${files.length} plantillas` : "Subir plantilla"}
          </button>
        </form>

        {uploadQueue.length > 0 && (
          <div className="mt-5 rounded-md border border-[#d8f3dc] bg-[#fffdf8]/82 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">Cola de subida</p>
              <p className="text-xs text-slate-500">
                {uploadQueue.filter((item) => item.status === "registered").length}/{uploadQueue.length} registradas
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {uploadQueue.map((item) => (
                <div key={item.id} className="interactive-subtle flex items-start justify-between gap-3 rounded-md border border-[#d8f3dc] bg-[#faf9f6] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.filename}</p>
                    <p className="text-xs text-slate-500">{item.message}</p>
                  </div>
                  <UploadStatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {message && <p className="status-success mt-4">{message}</p>}
        {error && <p className="status-error mt-4">{error}</p>}
      </section>

      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <h2 className="panel-title mt-3">Tus plantillas</h2>
            <p className="body-muted mt-3">
              {templates.length === 0
                ? "Aún no has subido plantillas."
                : `${templates.length} plantillas guardadas. ${readyCount} listas para futuras generaciones con referencia.`}
            </p>
          </div>
          <span className="badge badge-free">
            {templates.length} archivos
          </span>
        </div>

        {templates.length > 0 && (
          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]">
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field-control mt-2"
                placeholder="Nombre, categoría o descripción..."
              />
            </label>
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Vista</span>
              <select
                value={favoriteFilter}
                onChange={(event) => setFavoriteFilter(event.target.value as "all" | "favorites")}
                className="field-control mt-2"
              >
                <option value="all">Todas</option>
                <option value="favorites">Destacadas</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Estado</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | DocumentTemplateRow["status"])}
                className="field-control mt-2"
              >
                <option value="all">Todos</option>
                <option value="uploaded">Subidas</option>
                <option value="processing">Procesando</option>
                <option value="ready">Listas</option>
                <option value="failed">Error</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Categoría</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="field-control mt-2"
              >
                <option value="all">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setFavoriteFilter("all");
                }}
                className="focus-ring btn-secondary w-full px-4 py-3 text-sm"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3">
          {templates.length === 0 ? (
            <EmptyState
              eyebrow="Biblioteca vacía"
              title="Sube tu primera plantilla"
              description="Guarda documentos propios para que DocuGen pueda usarlos como referencia al crear nuevos borradores."
              variant="flat"
              steps={["Sube un DOCX o PDF claro.", "Procesa la plantilla para extraer texto y estructura.", "Úsala desde Crear como referencia controlada."]}
            >
              <PlanFirstSteps plan={plan} context="templates" compact />
            </EmptyState>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              eyebrow="Sin resultados"
              title="No hay plantillas con esos filtros"
              description="Prueba con otra búsqueda, cambia el estado o vuelve a mostrar toda la biblioteca."
              variant="flat"
            />
          ) : (
            filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                workspaceName={workspaces.find((workspace) => workspace.id === template.workspace_id)?.name || null}
                metrics={getTemplateUsageMetrics(initialTemplateMetrics, template.id)}
                workingId={workingId}
                onToggleFavorite={toggleFavorite}
                onDownloadOriginal={downloadOriginal}
                onProcessTemplate={processTemplate}
                onDeleteTemplate={deleteTemplate}
              />
            ))
          )}
        </div>
      </section>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  workspaceName,
  metrics,
  workingId,
  onToggleFavorite,
  onDownloadOriginal,
  onProcessTemplate,
  onDeleteTemplate,
}: {
  template: DocumentTemplateRow;
  workspaceName: string | null;
  metrics: ReturnType<typeof getTemplateUsageMetrics>;
  workingId: string | null;
  onToggleFavorite: (template: DocumentTemplateRow) => void;
  onDownloadOriginal: (template: DocumentTemplateRow) => void;
  onProcessTemplate: (template: DocumentTemplateRow) => void;
  onDeleteTemplate: (template: DocumentTemplateRow) => void;
}) {
  const analysis = getTemplateCardAnalysis(template.extracted_metadata);
  const qaReport = getTemplateQaReport(template);
  const isWorking = workingId === template.id;
  const createdAt = new Date(template.created_at).toLocaleDateString("es-ES");

  return (
    <article className="surface-flat interactive-subtle p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[#1f2933]">{template.name}</h3>
            {template.is_favorite && <FavoriteBadge />}
            {workspaceName && <span className="badge badge-empresa">{workspaceName}</span>}
            <StatusBadge status={template.status} />
            <span className={`badge border ${getTemplateQaStyles(qaReport.level)}`}>QA {qaReport.label}</span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {template.original_filename} · {template.file_type.toUpperCase()} · {formatBytes(template.file_size)} · {createdAt}
          </p>

          {(template.category || template.description) && (
            <p className="body-muted mt-3">
              {template.category && <strong>{template.category}: </strong>}
              {template.description || "Sin descripción."}
            </p>
          )}

          {template.summary && <p className="status-note mt-3">{template.summary}</p>}

          {analysis && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge bg-[#fffdf8]/82 text-[#2d6a4f]">{analysis.sections} secciones</span>
              <span className="badge bg-[#fffdf8]/82 text-[#2d6a4f]">{analysis.variables} variables</span>
              <span className="badge bg-[#fffdf8]/82 text-[#2d6a4f]">Calidad {analysis.qualityScore}/100</span>
            </div>
          )}

          <p className="status-note mt-3 text-xs">{qaReport.summary}</p>

          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <span className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/76 px-3 py-2">Usos: {metrics.totalUses}</span>
            <span className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/76 px-3 py-2">
              Último uso: {formatDateOrNever(metrics.lastUsedAt)}
            </span>
            <span className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/76 px-3 py-2">
              Modo: {formatUsageMode(metrics.mostUsedMode)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-48 xl:flex-col xl:items-stretch">
          {template.status === "ready" && (
            <Link href={`/plantillas/${template.id}/generar`} className="focus-ring btn-primary px-3 py-2 text-xs">
              Generar con esta
            </Link>
          )}
          <Link href={`/plantillas/${template.id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
            Ver detalle
          </Link>
          <button
            type="button"
            onClick={() => onToggleFavorite(template)}
            disabled={isWorking}
            className={`focus-ring rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-60 ${
              template.is_favorite
                ? "border-[#2d6a4f] bg-[#d8f3dc] text-[#1f2933]"
                : "border-[#d8f3dc] bg-[#fffdf8]/72 text-[#2d6a4f] hover:border-[#2d6a4f]"
            }`}
          >
            {template.is_favorite ? "Quitar destaque" : "Destacar"}
          </button>
          <button
            type="button"
            onClick={() => onDownloadOriginal(template)}
            disabled={isWorking}
            className="focus-ring btn-ghost px-3 py-2 text-xs disabled:opacity-60"
          >
            Descargar original
          </button>
          <button
            type="button"
            onClick={() => onProcessTemplate(template)}
            disabled={isWorking}
            className="focus-ring btn-ghost px-3 py-2 text-xs disabled:opacity-60"
          >
            {isWorking ? "Procesando..." : template.status === "ready" ? "Reprocesar" : "Procesar"}
          </button>
          <button
            type="button"
            onClick={() => onDeleteTemplate(template)}
            disabled={isWorking}
            className="focus-ring rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            Borrar
          </button>
        </div>
      </div>
    </article>
  );
}
function formatDateOrNever(value: string | null) {
  if (!value) {
    return "Sin uso";
  }

  return new Date(value).toLocaleDateString("es-ES");
}

function formatUsageMode(mode: ReturnType<typeof getTemplateUsageMetrics>["mostUsedMode"]) {
  if (!mode) {
    return "Sin datos";
  }

  return templateUsageLabels[mode];
}

function LibraryMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat interactive-subtle p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="body-muted mt-2 text-xs">{helper}</p>
    </div>
  );
}

function filterTemplates(
  templates: DocumentTemplateRow[],
  query: string,
  statusFilter: "all" | DocumentTemplateRow["status"],
  categoryFilter: string,
  favoriteFilter: "all" | "favorites",
) {
  const normalizedQuery = query.trim().toLowerCase();

  return templates.filter((template) => {
    const matchesStatus = statusFilter === "all" || template.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    const matchesFavorite = favoriteFilter === "all" || template.is_favorite;
    const searchable = `${template.name} ${template.category || ""} ${template.description || ""} ${template.original_filename}`.toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

    return matchesStatus && matchesCategory && matchesFavorite && matchesQuery;
  });
}

function getTemplateCardAnalysis(metadata: Record<string, unknown> | null) {
  const sections = Array.isArray(metadata?.sections) ? metadata.sections.length : 0;
  const variables = Array.isArray(metadata?.variables) ? metadata.variables.length : 0;
  const quality = readRecord(metadata?.quality);
  const qualityScore = typeof quality?.score === "number" ? quality.score : null;

  if (!sections && !variables && qualityScore === null) {
    return null;
  }

  return {
    sections,
    variables,
    qualityScore: qualityScore ?? 0,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function StatusBadge({ status }: { status: DocumentTemplateRow["status"] }) {
  const labels: Record<DocumentTemplateRow["status"], string> = {
    uploaded: "Subida",
    processing: "Procesando",
    ready: "Lista",
    failed: "Error",
  };

  const styles: Record<DocumentTemplateRow["status"], string> = {
    uploaded: "badge-free",
    processing: "border border-amber-200 bg-[#fff8e6] text-amber-800",
    ready: "badge-pro",
    failed: "border border-red-200 bg-red-50 text-red-700",
  };

  return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
}

function UploadStatusBadge({ status }: { status: UploadQueueStatus }) {
  const labels: Record<UploadQueueStatus, string> = {
    pending: "Pendiente",
    uploading: "Subiendo",
    registered: "Lista",
    failed: "Error",
  };
  const styles: Record<UploadQueueStatus, string> = {
    pending: "badge border border-slate-200 bg-slate-100 text-slate-600",
    uploading: "badge badge-free",
    registered: "badge badge-pro",
    failed: "badge border border-red-200 bg-red-50 text-red-700",
  };

  return <span className={`shrink-0 ${styles[status]}`}>{labels[status]}</span>;
}

function FavoriteBadge() {
  return <span className="badge bg-[#1f2933] text-white">Destacada</span>;
}

function sortTemplates(templates: DocumentTemplateRow[]) {
  return [...templates].sort((first, second) => {
    if (first.is_favorite !== second.is_favorite) {
      return first.is_favorite ? -1 : 1;
    }

    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
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

function getTemplateNameForFile(filename: string, baseName: string, totalFiles: number) {
  const cleanBaseName = baseName.trim();
  const fallbackName = removeExtension(filename);

  if (!cleanBaseName) {
    return fallbackName;
  }

  if (totalFiles === 1) {
    return cleanBaseName;
  }

  return `${cleanBaseName} - ${fallbackName}`;
}

function formatBytes(value: number | null) {
  if (!value) {
    return "tamaño pendiente";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

