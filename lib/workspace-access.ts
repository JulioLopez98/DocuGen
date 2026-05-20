import type { Profile, WorkspaceMemberRow } from "@/lib/supabase-server";
import type { requireUser } from "@/lib/supabase-server";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>;

export async function canUseWorkspace(
  supabase: SupabaseServerClient,
  userId: string,
  profile: Profile,
  workspaceId?: string | null,
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

  return { allowed: true, workspaceId };
}
