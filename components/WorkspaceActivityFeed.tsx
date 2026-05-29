"use client";

import { useMemo, useState } from "react";
import type { WorkspaceAuditEventRow, WorkspaceAuditEventType, WorkspaceMemberProfile } from "@/lib/supabase-server";

type WorkspaceActivityFeedProps = {
  events: WorkspaceAuditEventRow[];
  actorProfiles: WorkspaceMemberProfile[];
};

type ActivityFilter = "all" | "documents" | "templates" | "team";

const eventLabels: Record<WorkspaceAuditEventType, string> = {
  document_created: "Documento creado",
  document_deleted: "Documento borrado",
  documents_cleared: "Documentos borrados",
  template_uploaded: "Plantilla subida",
  template_processed: "Plantilla procesada",
  template_updated: "Plantilla actualizada",
  template_deleted: "Plantilla borrada",
  member_invited: "Invitación enviada",
  member_joined: "Miembro unido",
  member_role_updated: "Rol actualizado",
  member_permissions_updated: "Permisos actualizados",
  member_removed: "Miembro eliminado",
  invitation_revoked: "Invitación revocada",
};

const filterLabels: Array<{ value: ActivityFilter; label: string }> = [
  { value: "all", label: "Todo" },
  { value: "documents", label: "Documentos" },
  { value: "templates", label: "Plantillas" },
  { value: "team", label: "Equipo" },
];

export function WorkspaceActivityFeed({ events, actorProfiles }: WorkspaceActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const actorById = useMemo(
    () => new Map(actorProfiles.map((profile) => [profile.id, profile.email])),
    [actorProfiles],
  );
  const filteredEvents = events.filter((event) => getEventFilter(event.event_type) === filter || filter === "all");

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Auditoría</p>
          <h2 className="panel-title mt-3">Actividad reciente</h2>
          <p className="body-muted mt-2">
            Registro de acciones relevantes dentro del equipo: documentos, plantillas, miembros e invitaciones.
          </p>
        </div>
        <span className="badge badge-empresa">
          {filteredEvents.length} eventos
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filterLabels.map((item) => (
          <button
            key={item.value}
            className={`focus-ring rounded-full px-3 py-2 text-xs font-bold transition ${
              filter === item.value ? "bg-[#2d6a4f] text-white" : "bg-[#faf9f6] text-[#2d6a4f] hover:bg-[#d8f3dc]"
            }`}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {filteredEvents.length === 0 ? (
          <div className="status-note">
            No hay actividad para este filtro todavía.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <article key={event.id} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-white/72 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{event.summary}</p>
                    <span className="badge badge-free px-2 py-1 text-[11px]">
                      {eventLabels[event.event_type]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {actorById.get(event.actor_id || "") || "Sistema"} ·{" "}
                    {new Date(event.created_at).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {event.target_type && (
                  <span className="rounded-full bg-[#faf9f6] px-3 py-1 text-xs font-semibold text-slate-600">
                    {event.target_type}
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function getEventFilter(eventType: WorkspaceAuditEventType): ActivityFilter {
  if (eventType.startsWith("document")) {
    return "documents";
  }

  if (eventType.startsWith("template")) {
    return "templates";
  }

  return "team";
}
