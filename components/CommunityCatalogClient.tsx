"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const planLabels: Record<CommunityDocumentTypeRow["required_plan"], string> = {
  free: "Free",
  pro: "Pro",
  empresa: "Empresa",
};

type EditableCandidate = Pick<
  CommunityDocumentTypeRow,
  "label" | "description" | "category" | "status" | "required_plan" | "prompt_brief" | "admin_notes"
>;

export function CommunityCatalogClient({ candidates, sourceRequests }: CommunityCatalogClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editableCandidates, setEditableCandidates] = useState<Record<string, EditableCandidate>>(() =>
    Object.fromEntries(
      candidates.map((candidate) => [
        candidate.id,
        {
          label: candidate.label,
          description: candidate.description,
          category: candidate.category || "",
          status: candidate.status,
          required_plan: candidate.required_plan,
          prompt_brief: candidate.prompt_brief,
          admin_notes: candidate.admin_notes || "",
        },
      ]),
    ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  function updateCandidate(id: string, patch: Partial<EditableCandidate>) {
    setEditableCandidates((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function saveCandidate(id: string) {
    const payload = editableCandidates[id];

    if (!payload) {
      return;
    }

    setBusyId(id);
    setSavedId(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/community-document-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo actualizar el candidato.");
        return;
      }

      setSavedId(id);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setBusyId(null);
    }
  }

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

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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
            const editable = editableCandidates[candidate.id] || {
              label: candidate.label,
              description: candidate.description,
              category: candidate.category || "",
              status: candidate.status,
              required_plan: candidate.required_plan,
              prompt_brief: candidate.prompt_brief,
              admin_notes: candidate.admin_notes || "",
            };
            const isBusy = busyId === candidate.id;
            const isSaved = savedId === candidate.id;

            return (
              <article key={candidate.id} className="surface-flat interactive rounded-md p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif-display text-2xl font-bold">{candidate.label}</h2>
                      <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold text-[#2d6a4f]">
                        {statusLabels[editable.status]}
                      </span>
                      <span className="rounded-full bg-[#2d6a4f] px-2 py-1 text-xs font-bold uppercase text-white">
                        {planLabels[editable.required_plan]}
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

                <div className="mt-4 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Nombre</span>
                      <input
                        value={editable.label}
                        onChange={(event) => updateCandidate(candidate.id, { label: event.target.value })}
                        className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Categoría</span>
                      <input
                        value={editable.category || ""}
                        onChange={(event) => updateCandidate(candidate.id, { category: event.target.value })}
                        className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Descripción</span>
                    <textarea
                      value={editable.description}
                      onChange={(event) => updateCandidate(candidate.id, { description: event.target.value })}
                      rows={3}
                      className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Estado</span>
                      <select
                        value={editable.status}
                        onChange={(event) =>
                          updateCandidate(candidate.id, { status: event.target.value as CommunityDocumentTypeRow["status"] })
                        }
                        className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Plan requerido</span>
                      <select
                        value={editable.required_plan}
                        onChange={(event) =>
                          updateCandidate(candidate.id, {
                            required_plan: event.target.value as CommunityDocumentTypeRow["required_plan"],
                          })
                        }
                        className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        {Object.entries(planLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Prompt base revisado</span>
                    <textarea
                      value={editable.prompt_brief}
                      onChange={(event) => updateCandidate(candidate.id, { prompt_brief: event.target.value })}
                      rows={6}
                      className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Notas internas</span>
                    <textarea
                      value={editable.admin_notes || ""}
                      onChange={(event) => updateCandidate(candidate.id, { admin_notes: event.target.value })}
                      rows={3}
                      className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Criterio de aprobación, campos pendientes o riesgos detectados."
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveCandidate(candidate.id)}
                      disabled={isBusy}
                      className="focus-ring btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? "Guardando..." : "Guardar revisión"}
                    </button>
                    {isSaved && <span className="text-xs font-semibold text-[#2d6a4f]">Guardado</span>}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Prompt base</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{editable.prompt_brief}</p>
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

                {(editable.admin_notes || source) && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {editable.admin_notes && (
                      <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Notas internas</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{editable.admin_notes}</p>
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
