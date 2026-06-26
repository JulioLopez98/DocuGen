"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Profile,
  WorkspaceInvitationRow,
  WorkspaceMemberProfile,
  WorkspaceMemberRow,
  WorkspaceRow,
} from "@/lib/supabase-server";
import {
  inferWorkspaceRolePreset,
  workspaceRolePresets,
  type WorkspaceRolePreset,
} from "@/lib/workspace-roles";

type WorkspaceMembersManagerProps = {
  profile: Profile;
  workspace: WorkspaceRow | null;
  members: WorkspaceMemberRow[];
  memberProfiles: WorkspaceMemberProfile[];
  invitations: WorkspaceInvitationRow[];
};

type MemberApiResponse = {
  member?: WorkspaceMemberRow;
  message?: string;
};

type InvitationApiResponse = {
  invitation?: WorkspaceInvitationRow;
  message?: string;
};

const rolePresetOptions: Array<{ value: WorkspaceRolePreset; label: string }> = [
  { value: "admin", label: workspaceRolePresets.admin.label },
  { value: "editor", label: workspaceRolePresets.editor.label },
  { value: "contributor", label: workspaceRolePresets.contributor.label },
  { value: "viewer", label: workspaceRolePresets.viewer.label },
];

export function WorkspaceMembersManager({
  profile,
  workspace,
  members: initialMembers,
  memberProfiles,
  invitations: initialInvitations,
}: WorkspaceMembersManagerProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [email, setEmail] = useState("");
  const [rolePreset, setRolePreset] = useState<WorkspaceRolePreset>("contributor");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const profileById = useMemo(
    () => new Map(memberProfiles.map((memberProfile) => [memberProfile.id, memberProfile])),
    [memberProfiles],
  );
  const currentMembership = members.find((member) => member.user_id === profile.id);
  const canManageMembers =
    Boolean(workspace) &&
    (profile.plan === "empresa" || profile.role === "admin") &&
    (currentMembership?.role === "admin" || profile.role === "admin");

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace) {
      return;
    }

    setPendingAction("invite");
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, rolePreset }),
    });
    const data = (await response.json()) as InvitationApiResponse;

    if (!response.ok || !data.invitation) {
      setError(data.message || "No se pudo enviar la invitación.");
      setPendingAction(null);
      return;
    }

    setInvitations((current) => [
      data.invitation!,
      ...current.filter((invitation) => invitation.id !== data.invitation!.id),
    ]);
    setEmail("");
    setRolePreset("contributor");
    setFeedback("Invitación enviada por email.");
    setPendingAction(null);
    router.refresh();
  }

  async function updateMemberRole(memberId: string, nextRolePreset: WorkspaceRolePreset) {
    if (!workspace) {
      return;
    }

    setPendingAction(`role-${memberId}`);
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, rolePreset: nextRolePreset }),
    });
    const data = (await response.json()) as MemberApiResponse;

    if (!response.ok || !data.member) {
      setError(data.message || "No se pudo cambiar el rol.");
      setPendingAction(null);
      return;
    }

    setMembers((current) => current.map((member) => (member.id === memberId ? data.member! : member)));
    setFeedback("Rol actualizado.");
    setPendingAction(null);
    router.refresh();
  }

  async function updateMemberPermission(
    member: WorkspaceMemberRow,
    permission: keyof MemberPermissionPayload,
    value: boolean,
  ) {
    if (!workspace) {
      return;
    }

    setPendingAction(`permission-${member.id}-${permission}`);
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, permissions: { [permission]: value } }),
    });
    const data = (await response.json()) as MemberApiResponse;

    if (!response.ok || !data.member) {
      setError(data.message || "No se pudo actualizar el permiso.");
      setPendingAction(null);
      return;
    }

    setMembers((current) => current.map((currentMember) => (currentMember.id === member.id ? data.member! : currentMember)));
    setFeedback("Permiso actualizado.");
    setPendingAction(null);
    router.refresh();
  }

  async function removeMember(member: WorkspaceMemberRow) {
    if (!workspace || !confirm("¿Quieres quitar este miembro del equipo?")) {
      return;
    }

    setPendingAction(`remove-${member.id}`);
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id }),
    });
    const data = (await response.json()) as MemberApiResponse;

    if (!response.ok) {
      setError(data.message || "No se pudo quitar el miembro.");
      setPendingAction(null);
      return;
    }

    setMembers((current) => current.filter((currentMember) => currentMember.id !== member.id));
    setFeedback("Miembro quitado del equipo.");
    setPendingAction(null);
    router.refresh();
  }

  async function revokeInvitation(invitation: WorkspaceInvitationRow) {
    if (!workspace || !confirm("¿Quieres revocar esta invitación?")) {
      return;
    }

    setPendingAction(`revoke-${invitation.id}`);
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/invitations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: invitation.id }),
    });
    const data = (await response.json()) as InvitationApiResponse;

    if (!response.ok) {
      setError(data.message || "No se pudo revocar la invitación.");
      setPendingAction(null);
      return;
    }

    setInvitations((current) => current.filter((currentInvitation) => currentInvitation.id !== invitation.id));
    setFeedback("Invitación revocada.");
    setPendingAction(null);
    router.refresh();
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Miembros</p>
          <h2 className="panel-title mt-3">Personas y permisos</h2>
          <p className="body-muted mt-2">
            Invita personas por email y asigna roles claros: Admin, Editor, Miembro o Solo lectura.
          </p>
        </div>
        <span className="badge badge-empresa">
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </span>
      </div>

      {!workspace && (
        <div className="status-note mt-5">
          Todavía no tienes un equipo activo.
        </div>
      )}

      {workspace && !canManageMembers && (
        <div className="status-note mt-5">
          <p className="font-semibold text-[#2d6a4f]">Gestión de roles disponible en Empresa</p>
          <p className="body-muted mt-2">
            Puedes ver el equipo, pero invitar miembros, cambiar roles o quitarlos queda reservado para plan Empresa o
            administradores.
          </p>
        </div>
      )}

      {workspace && canManageMembers && (
        <form onSubmit={sendInvitation} className="surface-muted mt-5 grid gap-3 p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email del invitado
            <input
              className="field-control font-normal"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="persona@empresa.com"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-semibold">
              Rol inicial
              <select
                className="field-control font-normal"
                value={rolePreset}
                onChange={(event) => setRolePreset(event.target.value as WorkspaceRolePreset)}
              >
                {rolePresetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="focus-ring btn-primary px-4 py-3 text-sm" type="submit" disabled={pendingAction === "invite"}>
              {pendingAction === "invite" ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            {workspaceRolePresets[rolePreset].description} La invitación caduca en 7 días y debe aceptarse iniciando
            sesión con el mismo email.
          </p>
        </form>
      )}

      {(feedback || error) && (
        <p
          className={error ? "status-error mt-4" : "status-success mt-4"}
        >
          {error || feedback}
        </p>
      )}

      {invitations.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-[#2d6a4f]">Invitaciones pendientes</p>
          <div className="mt-3 grid gap-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold">{invitation.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Rol {getRoleLabel(getInvitationPreset(invitation))} · caduca el{" "}
                      {new Date(invitation.expires_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {canManageMembers && (
                    <button
                      className="focus-ring rounded-md border border-red-200 bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      type="button"
                      onClick={() => revokeInvitation(invitation)}
                      disabled={pendingAction === `revoke-${invitation.id}`}
                    >
                      {pendingAction === `revoke-${invitation.id}` ? "Revocando..." : "Revocar"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {members.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
            Todavía no hay miembros asociados a este equipo.
          </div>
        ) : (
          members.map((member) => {
            const memberProfile = profileById.get(member.user_id);
            const isOwner = workspace?.owner_id === member.user_id;
            const isCurrentUser = member.user_id === profile.id;
            const displayEmail = memberProfile?.email || (isCurrentUser ? profile.email : null) || member.user_id;
            const canEditThisMember = canManageMembers && !isOwner;
            const permissionItems = getPermissionItems(member);
            const inferredRole = inferWorkspaceRolePreset(member);

            return (
              <article key={member.id} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{displayEmail}</p>
                      {isOwner && (
                        <span className="rounded-full bg-[#1f2933] px-2 py-1 text-[11px] font-bold text-white">
                          Propietario
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-[11px] font-bold text-[#2d6a4f]">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Unido el {new Date(member.joined_at).toLocaleDateString("es-ES")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#faf9f6] px-2 py-1 text-[11px] font-bold text-[#1f2933]">
                        {getRoleLabel(inferredRole)}
                      </span>
                      {permissionItems.map((item) => (
                        <span
                          key={item.key}
                          className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                            item.enabled ? "bg-[#d8f3dc] text-[#2d6a4f]" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditThisMember ? (
                      <select
                        className="focus-ring rounded-md border border-[#c7ded0] bg-[#fffdf8] px-3 py-2 text-sm"
                        value={inferredRole === "custom" ? "custom" : inferredRole}
                        onChange={(event) => updateMemberRole(member.id, event.target.value as WorkspaceRolePreset)}
                        disabled={pendingAction === `role-${member.id}`}
                      >
                        {rolePresetOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        {inferredRole === "custom" && (
                          <option value="custom" disabled>
                            Personalizado
                          </option>
                        )}
                      </select>
                    ) : (
                      <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                        {getRoleLabel(inferredRole)}
                      </span>
                    )}

                    {canEditThisMember && (
                      <button
                        className="focus-ring rounded-md border border-red-200 bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={pendingAction === `remove-${member.id}`}
                      >
                        {pendingAction === `remove-${member.id}` ? "Quitando..." : "Quitar"}
                      </button>
                    )}
                  </div>
                </div>
                {canEditThisMember && member.role !== "admin" && (
                  <div className="mt-4 grid gap-2 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-3 sm:grid-cols-2">
                    <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                      Puedes partir de un rol predefinido y ajustar permisos concretos. Si cambias un permiso, el rol
                      pasará a Personalizado.
                    </p>
                    {permissionItems.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center justify-between gap-3 rounded-md bg-[#fffdf8]/76 px-3 py-2 text-xs"
                      >
                        <span>
                          <span className="block font-bold text-[#1f2933]">{item.label}</span>
                          <span className="mt-0.5 block text-slate-500">{item.description}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(event) => updateMemberPermission(member, item.key, event.target.checked)}
                          disabled={pendingAction === `permission-${member.id}-${item.key}`}
                          className="h-4 w-4 accent-[#2d6a4f]"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

type MemberPermissionPayload = {
  canCreateDocuments: boolean;
  canUploadTemplates: boolean;
  canManageTemplates: boolean;
  canInviteMembers: boolean;
};

function getPermissionItems(member: WorkspaceMemberRow) {
  const admin = member.role === "admin";

  return [
    {
      key: "canCreateDocuments" as const,
      label: "Generar",
      description: "Crear documentos en el equipo",
      enabled: admin || Boolean(member.can_create_documents),
    },
    {
      key: "canUploadTemplates" as const,
      label: "Subir plantillas",
      description: "Añadir referencias compartidas",
      enabled: admin || Boolean(member.can_upload_templates),
    },
    {
      key: "canManageTemplates" as const,
      label: "Gestionar plantillas",
      description: "Editar, procesar o borrar plantillas",
      enabled: admin || Boolean(member.can_manage_templates),
    },
    {
      key: "canInviteMembers" as const,
      label: "Invitar",
      description: "Enviar o revocar invitaciones",
      enabled: admin || Boolean(member.can_invite_members),
    },
  ];
}

function getRoleLabel(preset: WorkspaceRolePreset | "custom") {
  if (preset === "custom") {
    return "Personalizado";
  }

  return workspaceRolePresets[preset].label;
}

function getInvitationPreset(invitation: WorkspaceInvitationRow) {
  return inferWorkspaceRolePreset({
    role: invitation.role,
    can_create_documents: invitation.can_create_documents,
    can_upload_templates: invitation.can_upload_templates,
    can_manage_templates: invitation.can_manage_templates,
    can_invite_members: invitation.can_invite_members,
  });
}
