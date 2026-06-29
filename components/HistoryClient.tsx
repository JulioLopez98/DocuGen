"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PlanFirstSteps } from "@/components/PlanFirstSteps";
import { SaveToCatalogCard } from "@/components/SaveToCatalogCard";
import { downloadDocumentDocx } from "@/lib/docx";
import { getDocumentConfig, documentTypes } from "@/lib/document-types";
import { downloadDocumentPdf, downloadDocumentTxt, type PdfBrandSettings } from "@/lib/pdf";
import type { CommunityDocumentTypeRow, DocumentRequestTone, DocumentRow, WorkspaceRow } from "@/lib/supabase-server";
import { templateUsageLabels } from "@/lib/template-usage";

type HistoryClientProps = {
  documents: DocumentRow[];
  canExportDocx: boolean;
  plan: "free" | "pro" | "empresa";
  brandSettings?: PdfBrandSettings | null;
  workspaces?: WorkspaceRow[];
  personalCatalogTypes?: CommunityDocumentTypeRow[];
};

type GenerateResponse = {
  id?: string;
  message?: string;
};

type SortMode = "newest" | "oldest" | "type";

export function HistoryClient({ documents, canExportDocx, plan, brandSettings, workspaces = [], personalCatalogTypes = [] }: HistoryClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [catalogTypes, setCatalogTypes] = useState(personalCatalogTypes);
  const [openDocumentIds, setOpenDocumentIds] = useState<Set<string>>(new Set());

  const filteredDocuments = useMemo(
    () => filterAndSortDocuments(documents, query, typeFilter, sortMode),
    [documents, query, typeFilter, sortMode],
  );
  const groupedByMonth = useMemo(() => groupDocumentsByMonth(filteredDocuments), [filteredDocuments]);
  const hasFilters = query.trim().length > 0 || typeFilter !== "all" || sortMode !== "newest";
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  async function deleteDocument(id: string) {
    if (!window.confirm("¿Borrar este documento? Esta acción no se puede deshacer.")) {
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
      setError("No se pudo conectar con DocuGen. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function clearHistory() {
    if (!window.confirm("¿Borrar todos tus documentos? Esta acción no se puede deshacer.")) {
      return;
    }

    setBusyId("all");
    setError(null);

    try {
      const response = await fetch("/api/documents/clear", { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudieron borrar los documentos.");
        return;
      }

      router.refresh();
    } catch {
      setError("No se pudo conectar con DocuGen. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate(doc: DocumentRow) {
    setBusyId(doc.id);
    setError(null);

    try {
      const custom = isCustomDocument(doc);
      const community = isCommunityDocument(doc);
      const communityPayload = community ? buildCommunityRegeneratePayload(doc.form_data) : null;

      if (community && !communityPayload) {
        setError(
          "Este documento de Mi catálogo no se puede regenerar desde el historial porque falta su referencia interna. Abre Mi catálogo y vuelve a elegir el tipo.",
        );
        return;
      }

      const response = await fetch(custom ? "/api/custom-generate" : community ? "/api/community-generate" : "/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          custom
            ? buildCustomRegeneratePayload(doc.form_data)
            : community
              ? communityPayload
              : buildCatalogRegeneratePayload(doc),
        ),
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !payload.id) {
        setError(payload.message || "No se pudo regenerar el documento.");
        return;
      }

      router.push(`/historial/${payload.id}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el generador. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        eyebrow="Biblioteca vacía"
        title="Tus documentos aparecerán aquí"
        description="Cuando generes tu primer borrador, podrás abrirlo, descargarlo, reutilizarlo como base o borrarlo desde esta pantalla."
        primaryAction={{ href: "/generar", label: "Crear primer documento" }}
        secondaryAction={{ href: "/catalogo", label: "Ver tipos de documento" }}
        steps={
          plan === "free"
            ? ["Crea uno de los tipos incluidos en Free.", "Revisa el aviso de IA y completa datos pendientes.", "Descarga PDF/TXT o mejora a Pro cuando necesites Word."]
            : ["Crea un documento o reutiliza uno anterior.", "Usa plantillas propias si quieres estructura o tono.", "Exporta Word/PDF/TXT cuando esté listo."]
        }
      >
        <div className="grid gap-4">
          <PlanFirstSteps plan={plan} context="documents" />
          <div className="grid gap-3 sm:grid-cols-3">
          {["Contrato freelance", "Presupuesto comercial", "Carta de presentación"].map((item) => (
            <div key={item} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4 text-sm font-semibold">
              {item}
            </div>
          ))}
          </div>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5">
      <PersonalCatalogShelf
        types={catalogTypes}
        onUpdate={(updatedType) => setCatalogTypes((current) => current.map((type) => (type.id === updatedType.id ? updatedType : type)))}
        onDelete={(typeId) => setCatalogTypes((current) => current.filter((type) => type.id !== typeId))}
      />

      <section className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Buscar y filtrar</p>
            <h2 className="mt-2 text-xl font-bold">{documents.length} documentos guardados</h2>
            <p className="body-muted mt-1 text-xs">
              Busca por título, contenido o tipo. Abre cada documento solo cuando quieras verlo.
            </p>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            disabled={busyId === "all"}
            className="focus-ring rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {busyId === "all" ? "Borrando..." : "Borrar todo"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field-control mt-2"
              placeholder="Título, texto o tipo..."
            />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Tipo</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="field-control mt-2"
            >
              <option value="all">Todos</option>
              <option value="custom">A medida</option>
              <option value="assistant">Asistente</option>
              {documentTypes.map((doc) => (
                <option key={doc.type} value={doc.type}>
                  {doc.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Orden</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="field-control mt-2"
            >
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
              <option value="type">Por tipo</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setSortMode("newest");
              }}
              disabled={!hasFilters}
              className="focus-ring btn-secondary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      {error && <p className="status-error">{error}</p>}

      {filteredDocuments.length === 0 ? (
        <EmptyState
          eyebrow="Sin resultados"
          title="No hay documentos con esos filtros"
          description="Prueba con otro texto, cambia el tipo de documento o vuelve a la vista completa."
        >
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTypeFilter("all");
              setSortMode("newest");
            }}
            className="focus-ring btn-primary px-5 py-3 text-sm"
          >
            Limpiar filtros
          </button>
        </EmptyState>
      ) : (
        groupedByMonth.map((group) => (
          <section key={group.label} className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="eyebrow">{group.label}</h2>
              <span className="badge badge-free">{group.documents.length} documentos</span>
            </div>
            {group.documents.map((doc) => {
              const config = getDocumentConfig(doc.doc_type);
              const custom = isCustomDocument(doc);
              const community = isCommunityDocument(doc);
              const assistant = isAssistantDocument(doc);
              const canSaveToPersonalCatalog = canSaveDocumentToPersonalCatalog(doc);
              const createdAt = new Date(doc.created_at);
              const preview = doc.content.length > 900 ? `${doc.content.slice(0, 900)}...` : doc.content;
              const isBusy = busyId === doc.id;

              const expanded = openDocumentIds.has(doc.id);

              return (
                <article key={doc.id} className="surface-flat interactive-subtle">
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{doc.doc_label}</h3>
                        <span className="badge badge-free">
                          {custom ? "A medida" : assistant ? "Asistente" : config?.category || "Documento"}
                        </span>
                        {custom && <span className="badge badge-pro">Personalizado</span>}
                        {assistant && <span className="badge badge-pro">Chat</span>}
                        {community && <span className="badge badge-pro">Mi catálogo</span>}
                        {doc.reference_template_id && <span className="badge badge-pro">Con plantilla</span>}
                        {doc.workspace_id && (
                          <span className="badge bg-[#1f2933] text-white">
                            {workspaceById.get(doc.workspace_id)?.name || "Equipo"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Creado el {createdAt.toLocaleDateString("es-ES")} a las{" "}
                        {createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {doc.reference_template_id && (
                        <p className="mt-1 text-xs text-slate-500">
                          Referencia: {doc.reference_template_name || "Plantilla"} ·{" "}
                          {doc.template_usage_mode ? templateUsageLabels[doc.template_usage_mode] : "Modo no registrado"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canSaveToPersonalCatalog && (
                        <SaveToCatalogCard documentId={doc.id} title={doc.doc_label} variant="button" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDocumentIds((current) => {
                            const next = new Set(current);
                            if (next.has(doc.id)) {
                              next.delete(doc.id);
                            } else {
                              next.add(doc.id);
                            }
                            return next;
                          });
                        }}
                        className="focus-ring badge badge-free px-3 py-1.5"
                        aria-expanded={expanded}
                      >
                        {expanded ? "Plegar" : "Desplegar"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[#d8f3dc] p-4">
                      <article className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-4 text-sm leading-7">
                        {preview}
                      </article>
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div className="flex flex-wrap gap-2">
                          <Link href={"/historial/" + doc.id} className="focus-ring btn-primary px-3 py-2 text-sm">
                            Ver detalle
                          </Link>
                          {!custom && !assistant && !community && (
                            <Link href={"/generar?templateId=" + doc.id} className="focus-ring btn-secondary px-3 py-2 text-sm">
                              Reutilizar datos
                            </Link>
                          )}
                          {doc.reference_template_id && (
                            <Link href={buildSameTemplateUrl(doc)} className="focus-ring btn-secondary px-3 py-2 text-sm">
                              Nuevo con misma plantilla
                            </Link>
                          )}
                          {doc.reference_template_id && (
                            <Link href={"/plantillas/" + doc.reference_template_id} className="focus-ring btn-ghost px-3 py-2 text-sm">
                              Ver plantilla
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => regenerate(doc)}
                            disabled={isBusy}
                            className="focus-ring btn-secondary px-3 py-2 text-sm disabled:opacity-60"
                          >
                            {isBusy ? "Regenerando..." : "Regenerar"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              void downloadDocumentPdf({
                                title: doc.doc_label,
                                content: doc.content,
                                includesSignatures: config?.includesSignatures ?? false,
                                brandSettings,
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
                                includesSignatures: config?.includesSignatures ?? false,
                                canExportDocx,
                              })
                            }
                            className={
                              canExportDocx
                                ? "focus-ring btn-ghost px-3 py-2 text-sm"
                                : "focus-ring rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
                            }
                            title={canExportDocx ? "Descargar Word" : "Word solo está disponible en el plan Pro"}
                          >
                            {canExportDocx ? "Word" : "Word Pro"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteDocument(doc.id)}
                            disabled={isBusy}
                            className="focus-ring rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            {isBusy ? "Borrando..." : "Borrar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}

function PersonalCatalogShelf({
  types,
  onUpdate,
  onDelete,
}: {
  types: CommunityDocumentTypeRow[];
  onUpdate: (type: CommunityDocumentTypeRow) => void;
  onDelete: (typeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", description: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTypes = types.filter((type) => {
    if (!normalizedQuery) {
      return true;
    }

    return (type.label + " " + type.description + " " + (type.category || "")).toLowerCase().includes(normalizedQuery);
  });

  async function updateType(type: CommunityDocumentTypeRow) {
    setBusyId(type.id);
    setError(null);

    try {
      const response = await fetch("/api/personal-catalog/" + type.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label,
          description: draft.description,
          category: type.category || "Mi catálogo",
        }),
      });
      const payload = (await response.json().catch(() => null)) as { catalogType?: CommunityDocumentTypeRow; message?: string } | null;

      if (!response.ok || !payload?.catalogType) {
        setError(payload?.message || "No se pudo actualizar este tipo guardado.");
        return;
      }

      onUpdate(payload.catalogType);
      setEditingId(null);
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteType(type: CommunityDocumentTypeRow) {
    if (!window.confirm('Borrar "' + type.label + '" de Mi catálogo? Los documentos generados no se borrarán.')) {
      return;
    }

    setBusyId(type.id);
    setError(null);

    try {
      const response = await fetch("/api/personal-catalog/" + type.id, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message || "No se pudo borrar este tipo guardado.");
        return;
      }

      onDelete(type.id);
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Mi catálogo</p>
          <h2 className="mt-2 text-xl font-bold">Tipos guardados para reutilizar</h2>
          <p className="body-muted mt-1 max-w-2xl text-xs">
            Aquí viven los moldes que guardas desde documentos a medida o desde el asistente. No son archivos: son puntos de partida para crear nuevos documentos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-free">{types.length} tipos</span>
          <Link href="/generar?mode=custom" className="focus-ring btn-secondary px-3 py-2 text-sm">
            Crear a medida
          </Link>
        </div>
      </div>

      {types.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-[#b7e4c7] bg-[#f4fbf5] p-5">
          <p className="font-semibold text-[#2d6a4f]">Todavía no tienes tipos guardados</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Cuando generes algo a medida o desde el asistente, usa Guardar en Mi catálogo para poder crearlo otra vez sin partir de cero.
          </p>
        </div>
      ) : (
        <>
          <label className="mt-5 block">
            <span className="sr-only">Buscar en Mi catálogo</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tipo guardado..."
              className="field-control"
            />
          </label>
          {error && <p className="status-error mt-4">{error}</p>}
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {visibleTypes.map((type) => {
              const editing = editingId === type.id;
              const busy = busyId === type.id;

              return (
                <article key={type.id} className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/88 p-4">
                  {editing ? (
                    <div className="grid gap-3">
                      <label>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Nombre</span>
                        <input
                          value={draft.label}
                          onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                          className="field-control mt-2"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Descripción</span>
                        <textarea
                          value={draft.description}
                          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                          rows={3}
                          className="field-control mt-2"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void updateType(type)}
                          disabled={busy}
                          className="focus-ring btn-primary px-3 py-2 text-xs disabled:opacity-60"
                        >
                          {busy ? "Guardando..." : "Guardar"}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="focus-ring btn-ghost px-3 py-2 text-xs">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{type.category || "Mi catálogo"}</p>
                      <h3 className="font-serif-display mt-2 text-lg font-bold leading-6">{type.label}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{type.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d8f3dc] pt-4">
                        <Link href={"/generar?mode=community&communityTypeId=" + type.id} className="focus-ring btn-primary px-3 py-2 text-xs">
                          Usar
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(type.id);
                            setDraft({ label: type.label, description: type.description });
                          }}
                          className="focus-ring btn-secondary px-3 py-2 text-xs"
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteType(type)}
                          disabled={busy}
                          className="focus-ring rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {busy ? "Borrando..." : "Borrar"}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {visibleTypes.length === 0 && (
            <p className="mt-4 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-4 text-sm text-slate-600">
              No hay tipos guardados que coincidan con esa búsqueda.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function filterAndSortDocuments(documents: DocumentRow[], query: string, typeFilter: string, sortMode: SortMode) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...documents]
    .filter((doc) => {
      const config = getDocumentConfig(doc.doc_type);
      const matchesType = typeFilter === "all" || doc.doc_type === typeFilter;
      const searchable = `${doc.doc_label} ${doc.content} ${config?.label || ""} ${config?.category || ""} ${
        isCustomDocument(doc) ? "custom a medida personalizado documento" : ""
      } ${isAssistantDocument(doc) ? "assistant asistente chat a medida personalizado" : ""}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesType && matchesQuery;
    })
    .sort((a, b) => {
      if (sortMode === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }

      if (sortMode === "type") {
        const typeComparison = a.doc_label.localeCompare(b.doc_label, "es");
        return typeComparison || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
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

function stripInternalFormData(formData: Record<string, string>) {
  return Object.fromEntries(Object.entries(formData).filter(([key]) => !key.startsWith("__")));
}

function isCustomDocument(doc: DocumentRow) {
  return doc.doc_type === "custom";
}

function isAssistantDocument(doc: DocumentRow) {
  return doc.doc_type === "assistant";
}

function canSaveDocumentToPersonalCatalog(doc: DocumentRow) {
  return isCustomDocument(doc) || isAssistantDocument(doc);
}

function isCommunityDocument(doc: DocumentRow) {
  return doc.doc_type.startsWith("community:");
}

function buildCatalogRegeneratePayload(doc: DocumentRow) {
  return {
    docType: doc.doc_type,
    formData: stripInternalFormData(doc.form_data),
    workspaceId: doc.workspace_id,
    referenceTemplateId: doc.reference_template_id,
    templateUsageMode: doc.template_usage_mode || undefined,
  };
}

function buildSameTemplateUrl(doc: DocumentRow) {
  const params = new URLSearchParams({
    type: doc.doc_type,
  });

  if (doc.reference_template_id) {
    params.set("referenceTemplateId", doc.reference_template_id);
  }

  if (doc.template_usage_mode) {
    params.set("templateUsageMode", doc.template_usage_mode);
  }

  return `/generar?${params.toString()}`;
}

function buildCustomRegeneratePayload(formData: Record<string, string>) {
  return {
    title: formData.title || "Documento personalizado",
    description: formData.description || formData.required_data || "Regenera este documento personalizado con los datos disponibles.",
    intendedUse: formData.intended_use || undefined,
    tone: (formData.tone as DocumentRequestTone) || "formal",
    sector: formData.sector || undefined,
    requiredData: formData.required_data || undefined,
  };
}

function buildCommunityRegeneratePayload(formData: Record<string, string>) {
  const communityReference = parseCommunityReference(formData.__community_type);

  if (!communityReference?.id) {
    return null;
  }

  return {
    communityTypeId: communityReference.id,
    formData: stripInternalFormData(formData),
  };
}

function parseCommunityReference(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as { id?: string };
  } catch {
    return null;
  }
}


