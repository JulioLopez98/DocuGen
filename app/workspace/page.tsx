import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
import { WorkspacePanel } from "@/components/WorkspacePanel";
import {
  createSupabaseServiceClient,
  getCurrentProfile,
  type DocumentRow,
  type WorkspaceAuditEventRow,
  type WorkspaceInvitationRow,
  type WorkspaceMemberProfile,
  type WorkspaceMemberRow,
  type WorkspaceNotificationRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Equipo",
  description: "Espacio de trabajo para documentos de empresa en DocuGen.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspacePage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("user_id", profile.id)
    .returns<WorkspaceMemberRow[]>();
  const workspaceIds = (memberships || []).map((member) => member.workspace_id);
  const { data: workspaces } = workspaceIds.length
    ? await supabase.from("workspaces").select("*").in("id", workspaceIds).order("created_at", { ascending: true }).returns<WorkspaceRow[]>()
    : { data: [] as WorkspaceRow[] };
  const { data: allMembers } = workspaceIds.length
    ? await supabase.from("workspace_members").select("*").in("workspace_id", workspaceIds).returns<WorkspaceMemberRow[]>()
    : { data: [] as WorkspaceMemberRow[] };
  const invitationWorkspaceIds =
    profile.role === "admin"
      ? workspaceIds
      : (memberships || [])
          .filter(
            (membership) =>
              profile.plan === "empresa" &&
              (membership.role === "admin" || Boolean(membership.can_invite_members)),
          )
          .map((membership) => membership.workspace_id);
  const memberUserIds = Array.from(new Set((allMembers || []).map((member) => member.user_id)));
  const serviceClient = createSupabaseServiceClient();
  const { data: memberProfiles } =
    serviceClient && memberUserIds.length
      ? await serviceClient
          .from("profiles")
          .select("id,email")
          .in("id", memberUserIds)
          .returns<WorkspaceMemberProfile[]>()
      : { data: [] as WorkspaceMemberProfile[] };
  const { data: documents } = await supabase
    .from("documents")
    .select("id,doc_type,doc_label,workspace_id,created_at")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<Pick<DocumentRow, "id" | "doc_label" | "doc_type" | "workspace_id" | "created_at">[]>();
  const { data: invitations } =
    serviceClient && invitationWorkspaceIds.length
      ? await serviceClient
          .from("workspace_invitations")
          .select("*")
          .in("workspace_id", invitationWorkspaceIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .returns<WorkspaceInvitationRow[]>()
      : { data: [] as WorkspaceInvitationRow[] };
  const { data: auditEvents } =
    workspaceIds.length
      ? await supabase
          .from("workspace_audit_events")
          .select("*")
          .in("workspace_id", workspaceIds)
          .order("created_at", { ascending: false })
          .limit(40)
          .returns<WorkspaceAuditEventRow[]>()
      : { data: [] as WorkspaceAuditEventRow[] };
  const auditActorIds = Array.from(
    new Set((auditEvents || []).map((event) => event.actor_id).filter((id): id is string => Boolean(id))),
  );
  const { data: auditActorProfiles } =
    serviceClient && auditActorIds.length
      ? await serviceClient
          .from("profiles")
          .select("id,email")
          .in("id", auditActorIds)
          .returns<WorkspaceMemberProfile[]>()
      : { data: [] as WorkspaceMemberProfile[] };
  const { data: notifications } =
    workspaceIds.length
      ? await supabase
          .from("workspace_notifications")
          .select("*")
          .eq("user_id", profile.id)
          .in("workspace_id", workspaceIds)
          .order("created_at", { ascending: false })
          .limit(30)
          .returns<WorkspaceNotificationRow[]>()
      : { data: [] as WorkspaceNotificationRow[] };
  const notificationActorIds = Array.from(
    new Set((notifications || []).map((notification) => notification.actor_id).filter((id): id is string => Boolean(id))),
  );
  const { data: notificationActorProfiles } =
    serviceClient && notificationActorIds.length
      ? await serviceClient
          .from("profiles")
          .select("id,email")
          .in("id", notificationActorIds)
          .returns<WorkspaceMemberProfile[]>()
      : { data: [] as WorkspaceMemberProfile[] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="eyebrow">Empresa</p>
            <h1 className="section-title mt-3 max-w-4xl">Un espacio claro para trabajar documentos en equipo</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Coordina miembros, documentos compartidos, invitaciones, avisos y actividad sin perder de vista quién
              puede hacer qué dentro del equipo.
            </p>
          </div>
          <div className="surface-muted p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Centro de control</p>
            <p className="body-muted mt-3">
              Empieza invitando a una persona, genera un documento dentro del equipo y revisa los avisos recientes para
              validar el flujo completo.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ContextualHelp
          title="Qué es Equipo"
          description="Equipo agrupa documentos, miembros, invitaciones y actividad cuando trabajas con más personas."
          items={["Comparte documentos con el equipo.", "Gestiona invitaciones.", "Revisa actividad reciente."]}
          tone="empresa"
        />
        <ContextualHelp
          title="Roles y permisos"
          description="Los permisos avanzados ayudan a separar quién puede invitar, gestionar miembros o ver información sensible."
          items={["Admin: gestiona el espacio.", "Miembro: trabaja dentro del equipo.", "Permisos finos: control adicional."]}
          tone="empresa"
        />
        <ContextualHelp
          title="Primer paso recomendado"
          description="Si estás empezando, crea un espacio de equipo pequeño, invita una persona de prueba y genera un documento compartido."
          primaryAction={{ href: "/generar", label: "Crear documento" }}
          tone="empresa"
        />
      </div>
      <WorkspacePanel
        profile={profile}
        workspaces={workspaces || []}
        members={allMembers || []}
        memberProfiles={memberProfiles || []}
        invitations={invitations || []}
        auditEvents={auditEvents || []}
        auditActorProfiles={auditActorProfiles || []}
        notifications={notifications || []}
        notificationActorProfiles={notificationActorProfiles || []}
        documents={documents || []}
      />
    </section>
  );
}
