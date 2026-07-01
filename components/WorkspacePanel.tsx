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
      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Espacio activo</p>
            <h1 className="panel-title mt-3">
              {selectedWorkspace?.name || "Espacio personal"}
            </h1>
            <p className="body-muted mt-3 max-w-3xl">
              Este es el centro del workspace: miembros, documentos compartidos, avisos y actividad del equipo en un solo sitio.
            </p>
          </div>
          <PlanBadge plan={profile.plan} />
        </div>

        {workspaces.length > 1 && (
          <div className="surface-muted mt-6 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#2d6a4f]">Cambiar espacio</p>
                <p className="mt-1 text-xs text-slate-500">Filtra miembros, documentos, avisos y auditoría.</p>
              </div>
              <select
                className="field-control min-w-64"
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
          <WorkspaceMetric label="Documentos" value={workspaceDocuments.length.toString()} helper="Compartidos aquí" />
          <WorkspaceMetric label="Avisos" value={unreadNotifications.toString()} helper="Sin leer" />
          <WorkspaceMetric label="Personales" value={personalDocuments.length.toString()} helper="Fuera del equipo" />
        </div>

        {selectedWorkspace && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-wrap gap-2">
              <WorkspaceCapability enabled={isWorkspaceAdmin} label="Admin" />
              <WorkspaceCapability enabled={canCreateInWorkspace} label="Puede generar" />
              <WorkspaceCapability enabled={canUploadTemplates} label="Puede subir plantillas" />
              <WorkspaceCapability enabled={canInviteMembers} label="Puede invitar" />
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
                Crear en equipo
              </Link>
              <Link href="/plantillas" className="focus-ring btn-secondary px-4 py-3 text-sm">
                Plantillas de equipo
              </Link>
            </div>
          </div>
        )}

        {!isEmpresa && (
          <div className="mt-6 grid gap-4">
            <div className="surface-muted p-5">
              <p className="font-semibold text-[#2d6a4f]">Preparado para Empresa</p>
              <p className="body-muted mt-2">
                El plan Empresa permitirá miembros, biblioteca compartida y marca por equipo. Tu base ya está creada
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

        <section className="surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Documentos</p>
              <h2 className="panel-title mt-3">Documentos compartidos</h2>
              <p className="body-muted mt-2">
                Últimos documentos vinculados a este espacio de equipo.
              </p>
            </div>
            <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
              Crear documento
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {workspaceDocuments.length === 0 ? (
              <EmptyWorkspaceBlock text="Aún no hay documentos compartidos en este equipo. Genera uno nuevo y elige guardarlo en el equipo para que aparezca aquí." />
            ) : (
              workspaceDocuments.slice(0, 8).map((document) => (
                <article
                  key={document.id}
                  className="interactive-subtle flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4"
                >
                  <div>
                    <p className="font-semibold">{document.doc_label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.doc_type} · {new Date(document.created_at).toLocaleDateString("es-ES")}
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
    <div className="surface-flat interactive-subtle p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="body-muted mt-1 text-xs">{helper}</p>
    </div>
  );
}

function WorkspaceCapability({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className={`badge ${enabled ? "badge-empresa" : "bg-slate-100 text-slate-500"}`}>
      {label}
    </span>
  );
}

function EmptyWorkspaceBlock({ text }: { text: string }) {
  return (
    <div className="status-note">
      {text}
    </div>
  );
}
