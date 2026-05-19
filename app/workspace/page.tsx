import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkspacePanel } from "@/components/WorkspacePanel";
import {
  getCurrentProfile,
  type DocumentRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Workspace",
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
  const { data: documents } = await supabase
    .from("documents")
    .select("id,doc_type,doc_label,workspace_id,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<Pick<DocumentRow, "id" | "doc_label" | "doc_type" | "workspace_id" | "created_at">[]>();

  return (
    <section className="container-page py-10">
      <WorkspacePanel
        profile={profile}
        workspaces={workspaces || []}
        members={allMembers || []}
        documents={documents || []}
      />
    </section>
  );
}
