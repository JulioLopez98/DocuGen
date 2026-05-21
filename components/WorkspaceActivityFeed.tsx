import type { WorkspaceAuditEventRow, WorkspaceMemberProfile } from "@/lib/supabase-server";

type WorkspaceActivityFeedProps = {
  events: WorkspaceAuditEventRow[];
  actorProfiles: WorkspaceMemberProfile[];
};

const eventLabels: Record<WorkspaceAuditEventRow["event_type"], string> = {
  document_created: "Documento creado",
  document_deleted: "Documento borrado",
  documents_cleared: "Historial borrado",
  template_uploaded: "Plantilla subida",
  template_processed: "Plantilla procesada",
  template_updated: "Plantilla actualizada",
  template_deleted: "Plantilla borrada",
  member_invited: "Invitacion enviada",
  member_joined: "Miembro unido",
  member_role_updated: "Rol actualizado",
  member_permissions_updated: "Permisos actualizados",
  member_removed: "Miembro eliminado",
  invitation_revoked: "Invitacion revocada",
};

export function WorkspaceActivityFeed({ events, actorProfiles }: WorkspaceActivityFeedProps) {
  const actorById = new Map(actorProfiles.map((profile) => [profile.id, profile.email]));

  return (
    <section className="surface rounded-md p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Actividad reciente</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Registro de acciones relevantes dentro del workspace: documentos, plantillas, miembros e invitaciones.
          </p>
        </div>
        <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
          {events.length} eventos
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
            Aun no hay actividad auditada en este workspace. Los nuevos eventos apareceran aqui.
          </div>
        ) : (
          events.map((event) => (
            <article key={event.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{event.summary}</p>
                    <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-[11px] font-bold text-[#2d6a4f]">
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
