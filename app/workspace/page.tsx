import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
            <p className="body-muted mt-4 max-w-3xl">Trabaja con documentos compartidos, miembros, plantillas de equipo y actividad reciente desde una vista pensada para empresas.</p>
          </div>
          <div className="surface-muted p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Centro de control</p>
            <p className="body-muted mt-3">Flujo recomendado: invita al equipo, crea documentos dentro del workspace y usa plantillas compartidas para mantener un estilo común.</p>
          </div>
        </div>
        <div className="grid border-t border-[#d8f3dc] bg-[#fffdf8]/70 md:grid-cols-4">
          {[
            ["1", "Elige espacio", "Todo se filtra por el workspace activo."],
            ["2", "Invita miembros", "Asigna un rol claro a cada persona."],
            ["3", "Comparte trabajo", "Crea documentos y plantillas dentro del equipo."],
            ["4", "Revisa actividad", "Avisos y auditoría muestran qué ha pasado."],
          ].map(([step, title, text]) => (
            <div key={step} className="border-t border-[#d8f3dc] p-4 md:border-l md:border-t-0 first:md:border-l-0">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#d8f3dc] text-xs font-bold text-[#2d6a4f]">{step}</span>
              <p className="mt-3 text-sm font-bold text-[#1f2933]">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
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
