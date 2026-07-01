"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import type { CommunityDocumentTypeRow } from "@/lib/supabase-server";

type PersonalCatalogClientProps = {
  initialTypes: CommunityDocumentTypeRow[];
  plan: "free" | "pro" | "empresa";
};

export function PersonalCatalogClient({ initialTypes, plan }: PersonalCatalogClientProps) {
  const [types, setTypes] = useState(initialTypes);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toolsOpenId, setToolsOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", description: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isPaid = plan === "pro" || plan === "empresa";
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTypes = useMemo(
    () =>
      types.filter((type) => {
        if (!normalizedQuery) {
          return true;
        }

        return (type.label + " " + type.description + " " + (type.category || "")).toLowerCase().includes(normalizedQuery);
      }),
    [normalizedQuery, types],
  );

  async function updateType(type: CommunityDocumentTypeRow) {
    setBusyId(type.id);
    setError(null);
    setMessage(null);

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
        setError(payload?.message || "No se pudo actualizar este formato guardado.");
        return;
      }

      setTypes((current) => current.map((currentType) => (currentType.id === payload.catalogType?.id ? payload.catalogType : currentType)));
      setEditingId(null);
      setMessage("Formato actualizado.");
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateType(type: CommunityDocumentTypeRow) {
    if (!window.confirm('Duplicar "' + type.label + '"? Se creará una copia editable sin cambiar el original.')) {
      return;
    }

    setBusyId(type.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + type.id + "/duplicate", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { catalogType?: CommunityDocumentTypeRow; message?: string } | null;

      if (!response.ok || !payload?.catalogType) {
        setError(payload?.message || "No se pudo duplicar este formato guardado.");
        return;
      }

      setTypes((current) => [payload.catalogType as CommunityDocumentTypeRow, ...current]);
      setMessage('Formato duplicado como "' + payload.catalogType.label + '".');
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  async function recalculateFields(type: CommunityDocumentTypeRow) {
    if (!window.confirm('Recalcular campos de "' + type.label + '" con IA? Se sustituirá el formulario sugerido, pero no se borrará ningún documento.')) {
      return;
    }

    setBusyId(type.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + type.id + "/recalculate-fields", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { catalogType?: CommunityDocumentTypeRow; message?: string } | null;

      if (!response.ok || !payload?.catalogType) {
        setError(payload?.message || "No se pudieron recalcular los campos.");
        return;
      }

      setTypes((current) => current.map((currentType) => (currentType.id === payload.catalogType?.id ? payload.catalogType : currentType)));
      setMessage('Campos recalculados para "' + payload.catalogType.label + '".');
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
    setMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + type.id, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message || "No se pudo borrar este formato guardado.");
        return;
      }

      setTypes((current) => current.filter((currentType) => currentType.id !== type.id));
      setMessage("Formato eliminado de Mi catálogo.");
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="surface p-5 lg:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">Formatos reutilizables</p>
            <h2 className="mt-2 text-2xl font-bold">{types.length} formatos guardados</h2>
            <p className="body-muted mt-2 max-w-2xl text-sm">
              Usa esta biblioteca para repetir documentos que no están en el catálogo base: autorizaciones, anexos, comunicaciones internas o cualquier formato que hayas creado a medida.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/generar?mode=community" className="focus-ring btn-primary px-4 py-3 text-sm">
              Crear desde Mi catálogo
            </Link>
            <Link href="/generar?mode=custom" className="focus-ring btn-secondary px-4 py-3 text-sm">
              Nuevo a medida
            </Link>
          </div>
        </div>

        {!isPaid && (
          <div className="mt-5 rounded-md border border-[#d8f3dc] bg-[#f4fbf5] p-4">
            <p className="text-sm font-bold text-[#2d6a4f]">Función Pro</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Puedes revisar esta zona, pero guardar y reutilizar formatos personalizados está incluido en Pro y Empresa.
            </p>
          </div>
        )}
      </section>

      <section className="surface p-5 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="eyebrow">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, descripción o categoría..."
              className="field-control mt-2"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="badge badge-soft">{visibleTypes.length} visibles</span>
            {query && (
              <button type="button" onClick={() => setQuery("")} className="focus-ring btn-secondary px-4 py-3 text-sm">
                Limpiar
              </button>
            )}
          </div>
        </div>
        {error && <p className="status-error mt-4">{error}</p>}
        {message && <p className="mt-4 rounded-md border border-[#b7e4c7] bg-[#f4fbf5] p-3 text-sm font-semibold text-[#2d6a4f]">{message}</p>}
      </section>

      {types.length === 0 ? (
        <EmptyState
          eyebrow="Mi catálogo vacío"
          title="Aún no tienes formatos guardados"
          description="Crea un documento a medida o desde el asistente. Cuando el resultado te sirva para repetirlo, guárdalo en Mi catálogo desde Documentos."
          primaryAction={{ href: "/generar?mode=custom", label: "Crear a medida" }}
          secondaryAction={{ href: "/asistente", label: "Abrir asistente" }}
        />
      ) : visibleTypes.length === 0 ? (
        <EmptyState
          eyebrow="Sin resultados"
          title="No hay formatos con esa búsqueda"
          description="Prueba con otra palabra o limpia el buscador para volver a ver todos tus formatos guardados."
          primaryAction={{ href: "/mi-catalogo", label: "Ver todo" }}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTypes.map((type) => {
            const editing = editingId === type.id;
            const toolsOpen = toolsOpenId === type.id;
            const busy = busyId === type.id;
            const fieldCount = Array.isArray(type.suggested_fields) ? type.suggested_fields.length : 0;

            return (
              <article key={type.id} className="surface-flat interactive-subtle p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{type.category || "Mi catálogo"}</p>
                  <span className="badge badge-pro">{fieldCount} campos</span>
                </div>

                {editing ? (
                  <div className="mt-4 grid gap-3">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Nombre</span>
                      <input
                        value={draft.label}
                        onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                        className="field-control mt-2"
                      />
                    </label>
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Descripción visible</span>
                      <textarea
                        value={draft.description}
                        onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                        rows={4}
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
                    <h3 className="font-serif-display mt-3 text-xl font-bold leading-7">{type.label}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{type.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d8f3dc] pt-4">
                      <Link href={"/generar?mode=community&communityTypeId=" + type.id} className="focus-ring btn-primary px-3 py-2 text-xs">
                        Usar formato
                      </Link>
                      <button
                        type="button"
                        onClick={() => setToolsOpenId(toolsOpen ? null : type.id)}
                        className="focus-ring btn-secondary px-3 py-2 text-xs"
                      >
                        {toolsOpen ? "Ocultar ajustes" : "Configurar"}
                      </button>
                    </div>

                    {toolsOpen && (
                      <div className="mt-4 rounded-md border border-[#d8f3dc] bg-white/75 p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Mantenimiento</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Ajusta este formato sin tocar los documentos que ya hayas generado con él.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(type.id);
                              setDraft({ label: type.label, description: type.description });
                            }}
                            className="focus-ring btn-ghost px-3 py-2 text-xs"
                          >
                            Editar guía
                          </button>
                          <button
                            type="button"
                            onClick={() => void duplicateType(type)}
                            disabled={busy || !isPaid}
                            title={isPaid ? "Crear una copia editable" : "Disponible en Pro y Empresa"}
                            className="focus-ring btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ? "Duplicando..." : "Duplicar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void recalculateFields(type)}
                            disabled={busy || !isPaid}
                            title={isPaid ? "Recalcular formulario sugerido" : "Disponible en Pro y Empresa"}
                            className="focus-ring btn-ghost px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ? "Recalculando..." : "Recalcular campos"}
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
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}