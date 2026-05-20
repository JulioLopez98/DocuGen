import type { Profile, WorkspaceMemberRow } from "@/lib/supabase-server";
import type { requireUser } from "@/lib/supabase-server";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>;

export type WorkspacePermission =
  | "create_documents"
  | "upload_templates"
  | "manage_templates"
  | "invite_members";

export async function canUseWorkspace(
  supabase: SupabaseServerClient,
  userId: string,
  profile: Profile,
  workspaceId?: string | null,
  permission: WorkspacePermission = "create_documents",
) {
  if (!workspaceId) {
    return { allowed: true, workspaceId: null };
  }

  if (profile.plan !== "empresa" && profile.role !== "admin") {
    return { allowed: false, workspaceId, reason: "empresa_required" as const };
  }

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle<WorkspaceMemberRow>();

  if (error || !membership) {
    return { allowed: false, workspaceId, reason: "not_member" as const };
  }

  if (membership.role === "admin" || profile.role === "admin") {
    return { allowed: true, workspaceId, membership };
  }

  const allowedByPermission = {
    create_documents: membership.can_create_documents,
    upload_templates: membership.can_upload_templates,
    manage_templates: membership.can_manage_templates,
    invite_members: membership.can_invite_members,
  } satisfies Record<WorkspacePermission, boolean>;

  if (!allowedByPermission[permission]) {
    return { allowed: false, workspaceId, membership, reason: "permission_denied" as const };
  }

  return { allowed: true, workspaceId, membership };
}

export function canInviteMembers(membership: WorkspaceMemberRow | null | undefined, profile: Profile) {
  return profile.role === "admin" || membership?.role === "admin" || Boolean(membership?.can_invite_members);
}
