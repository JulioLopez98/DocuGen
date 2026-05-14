"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import type { DocumentRequestRow, DocumentRequestStatus } from "@/lib/supabase-server";

type AdminDocumentRequestsProps = {
  requests: DocumentRequestRow[];
};

type EditableRequestState = {
  status: DocumentRequestStatus;
  admin_notes: string;
};

const statusOptions: Array<{ value: DocumentRequestStatus; label: string; helper: string }> = [
  { value: "submitted", label: "Nueva", helper: "Pendiente de revisar" },
  { value: "reviewing", label: "En revisión", helper: "Se está evaluando" },
  { value: "approved", label: "Candidata", helper: "Buena candidata para catálogo" },
  { value: "rejected", label: "Descartada", helper: "No interesa convertirla" },
  { value: "converted", label: "Convertida", helper: "Ya pasó a catálogo o definición interna" },
];

const statusLabels = Object.fromEntries(statusOptions.map((option) => [option.value, option.label])) as Record<DocumentRequestStatus, string>;

export function AdminDocumentRequests({ requests }: AdminDocumentRequestsProps) {
  const router = useRouter();
  const [editableRequests, setEditableRequests] = useState<Record<string, EditableRequestState>>(() =>
    Object.fromEntries(
      requests.map((request) => [
        request.id,
        {
          status: request.status,
          admin_notes: request.admin_notes || "",
        },
      ]),
    ),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const requestCounts = useMemo(() => countRequestStatuses(requests), [requests]);

  function updateLocalRequest(id: string, patch: Partial<EditableRequestState>) {
    setEditableRequests((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  async function saveRequest(id: string) {
    const payload = editableRequests[id];

    if (!payload) {
      return;
    }

    setBusyId(id);
    setError(null);
    setSavedId(null);

    try {
      const response = await fetch(`/api/admin/document-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo actualizar la solicitud.");
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

  return (
    <section className="surface mt-4 rounded-md p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Generador libre</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Solicitudes a medida</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Revisa lo que piden los usuarios, añade notas internas y marca candidatas para convertirlas en catálogo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <StatusPill label="Nuevas" value={requestCounts.submitted} />
          <StatusPill label="Revisión" value={requestCounts.reviewing} />
          <StatusPill label="Candidatas" value={requestCounts.approved} />
          <StatusPill label="Convertidas" value={requestCounts.converted} />
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3">
        {requests.map((request) => {
          const editable = editableRequests[request.id] || {
            status: request.status,
            admin_notes: request.admin_notes || "",
          };
          const isBusy = busyId === request.id;
          const isSaved = savedId === request.id;

          return (
            <article key={request.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
              <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{request.title}</h3>
                    <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold text-[#2d6a4f]">
                      {statusLabels[editable.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{request.description}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <span>{request.sector || "Sin sector"} · {request.tone}</span>
                    <span>{new Date(request.created_at).toLocaleString("es-ES")}</span>
                    {request.intended_use && <span className="sm:col-span-2">Uso: {request.intended_use}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.generated_document_id && (
                      <Link href={`/historial/${request.generated_document_id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                        Ver documento
                      </Link>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Estado</span>
                    <select
                      value={editable.status}
                      onChange={(event) =>
                        updateLocalRequest(request.id, { status: event.target.value as DocumentRequestStatus })
                      }
                      className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.helper}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-3 block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Notas internas</span>
                    <textarea
                      value={editable.admin_notes}
                      onChange={(event) => updateLocalRequest(request.id, { admin_notes: event.target.value })}
                      rows={4}
                      className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="Ej. Buena candidata para legal web. Revisar campos necesarios."
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveRequest(request.id)}
                      disabled={isBusy}
                      className="focus-ring btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? "Guardando..." : "Guardar cambios"}
                    </button>
                    {isSaved && <span className="text-xs font-semibold text-[#2d6a4f]">Guardado</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {requests.length === 0 && (
          <EmptyState
            eyebrow="Sin solicitudes"
            title="Aún no hay documentos a medida"
            description="Cuando los usuarios usen el generador libre, verás aquí qué documentos piden y cuáles conviene convertir en catálogo oficial."
            variant="flat"
          />
        )}
      </div>
    </section>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full bg-[#d8f3dc] px-3 py-1 font-bold text-[#2d6a4f]">
      {label}: {value}
    </span>
  );
}

function countRequestStatuses(requests: DocumentRequestRow[]): Record<DocumentRequestStatus, number> {
  return requests.reduce<Record<DocumentRequestStatus, number>>(
    (counts, request) => {
      counts[request.status] += 1;
      return counts;
    },
    { submitted: 0, reviewing: 0, approved: 0, rejected: 0, converted: 0 },
  );
}
