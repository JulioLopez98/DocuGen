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
        setError(payload?.message || "No se pudo actualizar este tipo guardado.");
        return;
      }

      setTypes((current) => current.map((currentType) => (currentType.id === payload.catalogType?.id ? payload.catalogType : currentType)));
      setEditingId(null);
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
        setError(payload?.message || "No se pudo duplicar este tipo guardado.");
        return;
      }

      setTypes((current) => [payload.catalogType as CommunityDocumentTypeRow, ...current]);
      setMessage('Tipo duplicado como "' + payload.catalogType.label + '".');
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
        setError(payload?.message || "No se pudo borrar este tipo guardado.");
        return;
      }

      setTypes((current) => current.filter((currentType) => currentType.id !== type.id));
    } catch {
      setError("No se pudo conectar con DocuGen. Inténtalo de nuevo en unos segundos.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="surface p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Biblioteca reutilizable</p>
            <h2 className="mt-2 text-xl font-bold">{types.length} tipos en Mi catálogo</h2>
            <p className="body-muted mt-1 max-w-2xl text-sm">
              Guarda aquí documentos a medida o del asistente para convertirlos en tipos reutilizables. No son archivos finales: son puntos de partida para generar nuevos borradores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/generar?mode=community" className="focus-ring btn-primary px-4 py-3 text-sm">
              Usar Mi catálogo
            </Link>
            <Link href="/generar?mode=custom" className="focus-ring btn-secondary px-4 py-3 text-sm">
              Crear a medida
            </Link>
          </div>
        </div>
      </section>

      {!isPaid && (
        <section className="rounded-md border border-[#d8f3dc] bg-[#f4fbf5] p-5">
          <p className="font-bold text-[#2d6a4f]">Mi catálogo está incluido en Pro</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Puedes ver esta zona, pero guardar tipos reutilizables está pensado para usuarios Pro y Empresa porque permite crear documentos personalizados recurrentes.
          </p>
          <Link href="/precios" className="focus-ring btn-primary mt-4 inline-flex px-4 py-3 text-sm">
            Ver planes
          </Link>
        </section>
      )}

      <section className="surface p-5 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="eyebrow">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre, guía o categoría..."
              className="field-control mt-2"
            />
          </label>
          {query && (
            <button type="button" onClick={() => setQuery("")} className="focus-ring btn-secondary px-4 py-3 text-sm">
              Limpiar
            </button>
          )}
        </div>
        {error && <p className="status-error mt-4">{error}</p>}
        {message && <p className="mt-4 rounded-md border border-[#b7e4c7] bg-[#f4fbf5] p-3 text-sm font-semibold text-[#2d6a4f]">{message}</p>}
      </section>

      {types.length === 0 ? (
        <EmptyState
          eyebrow="Mi catálogo vacío"
          title="Aún no tienes tipos reutilizables"
          description="Genera un documento a medida o desde el asistente. Si el resultado te sirve para el futuro, guárdalo en Mi catálogo desde Documentos."
          primaryAction={{ href: "/generar?mode=custom", label: "Crear a medida" }}
          secondaryAction={{ href: "/asistente", label: "Abrir asistente" }}
        />
      ) : visibleTypes.length === 0 ? (
        <EmptyState
          eyebrow="Sin resultados"
          title="No hay tipos con esa búsqueda"
          description="Prueba con otra palabra o limpia el buscador para volver a ver todos tus tipos guardados."
          primaryAction={{ href: "/mi-catalogo", label: "Ver todo" }}
        />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleTypes.map((type) => {
            const editing = editingId === type.id;
            const busy = busyId === type.id;

            return (
              <article key={type.id} className="surface-flat interactive-subtle p-4">
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
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Guía visible</span>
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{type.category || "Mi catálogo"}</p>
                      <span className="badge badge-pro">{type.suggested_fields.length} campos</span>
                    </div>
                    <h3 className="font-serif-display mt-3 text-xl font-bold leading-7">{type.label}</h3>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{type.description}</p>
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
