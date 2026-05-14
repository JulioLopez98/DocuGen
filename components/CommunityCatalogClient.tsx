"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import type { CommunityDocumentTypeRow, DocumentRequestRow } from "@/lib/supabase-server";

type CommunityCatalogClientProps = {
  candidates: CommunityDocumentTypeRow[];
  sourceRequests: DocumentRequestRow[];
};

const statusLabels: Record<CommunityDocumentTypeRow["status"], string> = {
  draft: "Borrador",
  reviewing: "En revisión",
  approved: "Aprobado",
  published: "Publicado",
  rejected: "Descartado",
};

export function CommunityCatalogClient({ candidates, sourceRequests }: CommunityCatalogClientProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const sourceById = useMemo(() => new Map(sourceRequests.map((request) => [request.id, request])), [sourceRequests]);
  const categories = useMemo(
    () => Array.from(new Set(candidates.map((candidate) => candidate.category || "A medida"))).sort((a, b) => a.localeCompare(b, "es")),
    [candidates],
  );
  const filteredCandidates = useMemo(
    () => filterCandidates(candidates, query, statusFilter, categoryFilter),
    [candidates, query, statusFilter, categoryFilter],
  );
  const hasFilters = query.trim().length > 0 || statusFilter !== "all" || categoryFilter !== "all";

  if (candidates.length === 0) {
    return (
      <EmptyState
        eyebrow="Sin candidatos"
        title="Aún no hay tipos comunitarios"
        description="Convierte solicitudes a medida desde el panel admin para empezar a construir el catálogo privado."
        primaryAction={{ href: "/admin", label: "Ir a solicitudes" }}
        variant="flat"
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className="surface rounded-md p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
              placeholder="Nombre, categoría, prompt..."
            />
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
            >
              <option value="all">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Categoría</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
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
              }}
              disabled={!hasFilters}
              className="focus-ring btn-secondary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      {filteredCandidates.length === 0 ? (
        <EmptyState
          eyebrow="Sin resultados"
          title="No hay candidatos con esos filtros"
          description="Prueba con otra búsqueda o vuelve a la vista completa del catálogo comunitario privado."
          variant="flat"
        />
      ) : (
        <section className="grid gap-4">
          {filteredCandidates.map((candidate) => {
            const source = candidate.source_request_id ? sourceById.get(candidate.source_request_id) : null;

            return (
              <article key={candidate.id} className="surface-flat interactive rounded-md p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif-display text-2xl font-bold">{candidate.label}</h2>
                      <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold text-[#2d6a4f]">
                        {statusLabels[candidate.status]}
                      </span>
                      <span className="rounded-full bg-[#2d6a4f] px-2 py-1 text-xs font-bold uppercase text-white">
                        {candidate.required_plan}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {candidate.category || "A medida"} · {candidate.slug} · {new Date(candidate.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Link href="/admin" className="focus-ring btn-ghost px-3 py-2 text-xs">
                    Ver solicitudes
                  </Link>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Prompt base</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{candidate.prompt_brief}</p>
                  </div>
                  <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Campos sugeridos</p>
                    <div className="mt-3 grid gap-2">
                      {candidate.suggested_fields.map((field) => (
                        <div key={field.name} className="flex items-center justify-between gap-3 rounded-md bg-[#faf9f6] px-3 py-2 text-sm">
                          <span className="font-semibold">{field.label}</span>
                          <span className="text-xs text-slate-500">{field.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {(candidate.admin_notes || source) && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {candidate.admin_notes && (
                      <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Notas internas</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{candidate.admin_notes}</p>
                      </div>
                    )}
                    {source && (
                      <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Solicitud origen</p>
                        <p className="mt-2 text-sm font-semibold">{source.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{source.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {source.generated_document_id && (
                            <Link href={`/historial/${source.generated_document_id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                              Ver documento generado
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function filterCandidates(
  candidates: CommunityDocumentTypeRow[],
  query: string,
  statusFilter: string,
  categoryFilter: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return candidates.filter((candidate) => {
    const category = candidate.category || "A medida";
    const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || category === categoryFilter;
    const searchable = `${candidate.label} ${candidate.description} ${candidate.category || ""} ${candidate.prompt_brief} ${candidate.slug}`.toLowerCase();
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

    return matchesStatus && matchesCategory && matchesQuery;
  });
}
