"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlanFirstSteps } from "@/components/PlanFirstSteps";
import { PlanBadge } from "@/components/PlanBadge";
import { WorkspaceActivityFeed } from "@/components/WorkspaceActivityFeed";
import { WorkspaceMembersManager } from "@/components/WorkspaceMembersManager";
import { WorkspaceNotificationsPanel } from "@/components/WorkspaceNotificationsPanel";
import type {
  DocumentRow,
  Profile,
  WorkspaceAuditEventRow,
  WorkspaceInvitationRow,
  WorkspaceMemberProfile,
  WorkspaceMemberRow,
  WorkspaceNotificationRow,
  WorkspaceRow,
} from "@/lib/supabase-server";

type WorkspacePanelProps = {
  profile: Profile;
  workspaces: WorkspaceRow[];
  members: WorkspaceMemberRow[];
  memberProfiles: WorkspaceMemberProfile[];
  invitations: WorkspaceInvitationRow[];
  auditEvents: WorkspaceAuditEventRow[];
  auditActorProfiles: WorkspaceMemberProfile[];
  notifications: WorkspaceNotificationRow[];
  notificationActorProfiles: WorkspaceMemberProfile[];
  documents: Pick<DocumentRow, "id" | "doc_label" | "doc_type" | "workspace_id" | "created_at">[];
};

export function WorkspacePanel({
  profile,
  workspaces,
  members,
  memberProfiles,
  invitations,
  auditEvents,
  auditActorProfiles,
  notifications,
  notificationActorProfiles,
  documents,
}: WorkspacePanelProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaces[0]?.id || "");
  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || workspaces[0] || null,
    [selectedWorkspaceId, workspaces],
  );
  const currentMembership = selectedWorkspace
    ? members.find((member) => member.workspace_id === selectedWorkspace.id && member.user_id === profile.id)
    : null;
  const workspaceMembers = selectedWorkspace
    ? members.filter((member) => member.workspace_id === selectedWorkspace.id)
    : [];
  const workspaceInvitations = selectedWorkspace
    ? invitations.filter((invitation) => invitation.workspace_id === selectedWorkspace.id)
    : [];
  const workspaceDocuments = selectedWorkspace
    ? documents.filter((document) => document.workspace_id === selectedWorkspace.id)
    : [];
  const workspaceAuditEvents = selectedWorkspace
    ? auditEvents.filter((event) => event.workspace_id === selectedWorkspace.id)
    : [];
  const workspaceNotifications = selectedWorkspace
    ? notifications.filter((notification) => notification.workspace_id === selectedWorkspace.id)
    : [];
  const personalDocuments = documents.filter((document) => !document.workspace_id);
  const unreadNotifications = workspaceNotifications.filter((notification) => !notification.read_at).length;
  const isEmpresa = profile.plan === "empresa";
  const isWorkspaceAdmin = Boolean(currentMembership?.role === "admin" || profile.role === "admin");
  const canCreateInWorkspace = Boolean(
    selectedWorkspace && (isWorkspaceAdmin || currentMembership?.can_create_documents),
  );
  const canUploadTemplates = Boolean(
    selectedWorkspace && (isWorkspaceAdmin || currentMembership?.can_upload_templates),
  );
  const canInviteMembers = Boolean(
    selectedWorkspace && (isWorkspaceAdmin || currentMembership?.can_invite_members),
  );

  return (
    <div className="grid gap-6">
      <section className="surface rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Equipo</p>
            <h1 className="font-serif-display mt-3 text-4xl font-bold">
              {selectedWorkspace?.name || "Espacio personal"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Organiza documentos, miembros, avisos y actividad compartida desde una vista pensada para equipos.
            </p>
          </div>
          <PlanBadge plan={profile.plan} />
        </div>

        {workspaces.length > 1 && (
          <div className="mt-6 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#2d6a4f]">Cambiar espacio</p>
                <p className="mt-1 text-xs text-slate-500">Filtra miembros, documentos, avisos y auditoria.</p>
              </div>
              <select
                className="focus-ring min-w-64 rounded-md border border-[#c7ded0] bg-white px-3 py-3 text-sm font-semibold"
                value={selectedWorkspace?.id || ""}
                onChange={(event) => setSelectedWorkspaceId(event.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <WorkspaceMetric label="Espacios" value={workspaces.length.toString()} helper="Accesibles para ti" />
          <WorkspaceMetric label="Miembros" value={workspaceMembers.length.toString()} helper="En este espacio" />
          <WorkspaceMetric label="Documentos" value={workspaceDocuments.length.toString()} helper="Compartidos aqui" />
          <WorkspaceMetric label="Avisos" value={unreadNotifications.toString()} helper="Sin leer" />
          <WorkspaceMetric label="Personales" value={personalDocuments.length.toString()} helper="Sin equipo" />
        </div>

        {selectedWorkspace && (
          <div className="mt-5 flex flex-wrap gap-2">
            <WorkspaceCapability enabled={isWorkspaceAdmin} label="Admin" />
            <WorkspaceCapability enabled={canCreateInWorkspace} label="Puede generar" />
            <WorkspaceCapability enabled={canUploadTemplates} label="Puede subir plantillas" />
            <WorkspaceCapability enabled={canInviteMembers} label="Puede invitar" />
          </div>
        )}

        {!isEmpresa && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-5">
              <p className="font-semibold text-[#2d6a4f]">Preparado para Empresa</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El plan Empresa permitira miembros, biblioteca compartida y marca por equipo. Tu base ya esta creada
                para migrar cuando actives ese plan.
              </p>
              <Link href="/precios" className="focus-ring btn-primary mt-4 inline-flex px-4 py-3 text-sm">
                Ver plan Empresa
              </Link>
            </div>
            <PlanFirstSteps plan={profile.plan} context="team" />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <WorkspaceMembersManager
          profile={profile}
          workspace={selectedWorkspace}
          members={workspaceMembers}
          memberProfiles={memberProfiles}
          invitations={workspaceInvitations}
        />

        <section className="surface rounded-md p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Documentos</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Documentos compartidos</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ultimos documentos vinculados a este espacio de equipo.
              </p>
            </div>
            <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
              Crear documento
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {workspaceDocuments.length === 0 ? (
              <EmptyWorkspaceBlock text="Aun no hay documentos compartidos en este equipo. Genera uno nuevo y elige guardarlo en el equipo para que aparezca aqui." />
            ) : (
              workspaceDocuments.slice(0, 8).map((document) => (
                <article
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 p-4"
                >
                  <div>
                    <p className="font-semibold">{document.doc_label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.doc_type} - {new Date(document.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Link href={`/historial/${document.id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                    Abrir
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <WorkspaceNotificationsPanel
        workspaceId={selectedWorkspace?.id || null}
        notifications={workspaceNotifications}
        actorProfiles={notificationActorProfiles}
      />

      <WorkspaceActivityFeed events={workspaceAuditEvents} actorProfiles={auditActorProfiles} />
    </div>
  );
}

function WorkspaceMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat rounded-md p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function WorkspaceCapability({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        enabled ? "bg-[#d8f3dc] text-[#2d6a4f]" : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyWorkspaceBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
      {text}
    </div>
  );
}
