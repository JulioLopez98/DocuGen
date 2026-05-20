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
  const [role, setRole] = useState<"admin" | "member">("member");
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
      body: JSON.stringify({ email, role }),
    });
    const data = (await response.json()) as InvitationApiResponse;

    if (!response.ok || !data.invitation) {
      setError(data.message || "No se pudo enviar la invitacion.");
      setPendingAction(null);
      return;
    }

    setInvitations((current) => [
      data.invitation!,
      ...current.filter((invitation) => invitation.id !== data.invitation!.id),
    ]);
    setEmail("");
    setRole("member");
    setFeedback("Invitacion enviada por email.");
    setPendingAction(null);
    router.refresh();
  }

  async function updateMemberRole(memberId: string, nextRole: "admin" | "member") {
    if (!workspace) {
      return;
    }

    setPendingAction(`role-${memberId}`);
    setError(null);
    setFeedback(null);

    const response = await fetch(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: nextRole }),
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

  async function removeMember(member: WorkspaceMemberRow) {
    if (!workspace || !confirm("Quieres quitar este miembro del workspace?")) {
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
    setFeedback("Miembro quitado del workspace.");
    setPendingAction(null);
    router.refresh();
  }

  async function revokeInvitation(invitation: WorkspaceInvitationRow) {
    if (!workspace || !confirm("Quieres revocar esta invitacion?")) {
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
      setError(data.message || "No se pudo revocar la invitacion.");
      setPendingAction(null);
      return;
    }

    setInvitations((current) => current.filter((currentInvitation) => currentInvitation.id !== invitation.id));
    setFeedback("Invitacion revocada.");
    setPendingAction(null);
    router.refresh();
  }

  return (
    <section className="surface rounded-md p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Miembros</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Equipo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Invita personas por email, revisa accesos pendientes y gestiona los roles del workspace.
          </p>
        </div>
        <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </span>
      </div>

      {!workspace && (
        <div className="mt-5 rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-5 text-sm leading-6 text-slate-600">
          Todavia no tienes un workspace activo.
        </div>
      )}

      {workspace && !canManageMembers && (
        <div className="mt-5 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-5">
          <p className="font-semibold text-[#2d6a4f]">Invitaciones disponibles en Empresa</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Puedes ver el equipo, pero invitar miembros, cambiar roles o quitarlos queda reservado para plan Empresa o
            administradores.
          </p>
        </div>
      )}

      {workspace && canManageMembers && (
        <form onSubmit={sendInvitation} className="mt-5 grid gap-3 rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-4">
          <label className="grid gap-2 text-sm font-semibold">
            Email del invitado
            <input
              className="focus-ring rounded-md border border-[#c7ded0] bg-white px-3 py-3 font-normal"
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
                className="focus-ring rounded-md border border-[#c7ded0] bg-white px-3 py-3 font-normal"
                value={role}
                onChange={(event) => setRole(event.target.value as "admin" | "member")}
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button className="focus-ring btn-primary px-4 py-3 text-sm" type="submit" disabled={pendingAction === "invite"}>
              {pendingAction === "invite" ? "Enviando..." : "Enviar invitacion"}
            </button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            La invitacion caduca en 7 dias y debe aceptarse iniciando sesion con el mismo email.
          </p>
        </form>
      )}

      {(feedback || error) && (
        <p
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-700" : "border-[#d8f3dc] bg-white text-[#2d6a4f]"
          }`}
        >
          {error || feedback}
        </p>
      )}

      {invitations.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-[#2d6a4f]">Invitaciones pendientes</p>
          <div className="mt-3 grid gap-3">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold">{invitation.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Rol {invitation.role === "admin" ? "Admin" : "Miembro"} · caduca el{" "}
                      {new Date(invitation.expires_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  {canManageMembers && (
                    <button
                      className="focus-ring rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
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
            Todavia no hay miembros asociados a este workspace.
          </div>
        ) : (
          members.map((member) => {
            const memberProfile = profileById.get(member.user_id);
            const isOwner = workspace?.owner_id === member.user_id;
            const isCurrentUser = member.user_id === profile.id;
            const displayEmail = memberProfile?.email || (isCurrentUser ? profile.email : null) || member.user_id;
            const canEditThisMember = canManageMembers && !isOwner;

            return (
              <article key={member.id} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
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
                          Tu
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Unido el {new Date(member.joined_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditThisMember ? (
                      <select
                        className="focus-ring rounded-md border border-[#c7ded0] bg-white px-3 py-2 text-sm"
                        value={member.role}
                        onChange={(event) => updateMemberRole(member.id, event.target.value as "admin" | "member")}
                        disabled={pendingAction === `role-${member.id}`}
                      >
                        <option value="member">Miembro</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                        {member.role === "admin" ? "Admin" : "Miembro"}
                      </span>
                    )}

                    {canEditThisMember && (
                      <button
                        className="focus-ring rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        type="button"
                        onClick={() => removeMember(member)}
                        disabled={pendingAction === `remove-${member.id}`}
                      >
                        {pendingAction === `remove-${member.id}` ? "Quitando..." : "Quitar"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
