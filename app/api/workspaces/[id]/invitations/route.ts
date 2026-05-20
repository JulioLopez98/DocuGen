import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWorkspaceInvitationEmail } from "@/lib/resend";
import {
  createSupabaseServiceClient,
  requireUser,
  type Profile,
  type WorkspaceInvitationRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";
import {
  createInvitationToken,
  getWorkspaceInvitationUrl,
  hashInvitationToken,
} from "@/lib/workspace-invitations";
import { canInviteMembers } from "@/lib/workspace-access";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const createInvitationSchema = z.object({
  email: z.string().trim().email().max(240).transform((value) => value.toLowerCase()),
  role: z.enum(["admin", "member"]).default("member"),
});

const deleteInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireWorkspaceAdmin(params.id);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const payload = createInvitationSchema.parse(await request.json());
    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar SUPABASE_SERVICE_ROLE_KEY.");
    }

    const { data: existingProfile, error: profileError } = await db
      .from("profiles")
      .select("id,email")
      .ilike("email", payload.email)
      .maybeSingle<Pick<Profile, "id" | "email">>();

    if (profileError) {
      console.error("workspace_invitation_profile_lookup_error", profileError);
      return errorResponse(500, "profile_lookup_failed", "No se pudo comprobar ese email.");
    }

    if (existingProfile) {
      const { data: existingMember } = await db
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", auth.workspace.id)
        .eq("user_id", existingProfile.id)
        .maybeSingle<WorkspaceMemberRow>();

      if (existingMember) {
        return errorResponse(409, "already_member", "Ese usuario ya pertenece al workspace.");
      }
    }

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const invitationPayload = {
      workspace_id: auth.workspace.id,
      email: payload.email,
      role: payload.role,
      token_hash: tokenHash,
      invited_by: auth.user.id,
      status: "pending" as const,
      expires_at: expiresAt,
      accepted_by: null,
      accepted_at: null,
    };

    const { data: pendingInvitation } = await db
      .from("workspace_invitations")
      .select("*")
      .eq("workspace_id", auth.workspace.id)
      .ilike("email", payload.email)
      .eq("status", "pending")
      .maybeSingle<WorkspaceInvitationRow>();

    const invitationRequest = pendingInvitation
      ? db
          .from("workspace_invitations")
          .update(invitationPayload)
          .eq("id", pendingInvitation.id)
          .select("*")
          .single<WorkspaceInvitationRow>()
      : db.from("workspace_invitations").insert(invitationPayload).select("*").single<WorkspaceInvitationRow>();

    const { data: invitation, error: invitationError } = await invitationRequest;

    if (invitationError || !invitation) {
      console.error("workspace_invitation_save_error", invitationError);
      return errorResponse(500, "invitation_save_failed", "No se pudo guardar la invitacion.");
    }

    await sendWorkspaceInvitationEmail({
      to: payload.email,
      workspaceName: auth.workspace.name,
      inviterEmail: auth.profile.email,
      inviteUrl: getWorkspaceInvitationUrl(token),
      role: payload.role,
    });

    return NextResponse.json({ invitation }, { status: pendingInvitation ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el email y el rol.");
    }

    console.error("workspace_invitation_create_unhandled", error);
    return errorResponse(500, "invitation_create_failed", "No se pudo enviar la invitacion.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = await requireWorkspaceAdmin(params.id);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const payload = deleteInvitationSchema.parse(await request.json());
    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar SUPABASE_SERVICE_ROLE_KEY.");
    }

    const { data: invitation, error: updateError } = await db
      .from("workspace_invitations")
      .update({ status: "revoked" })
      .eq("id", payload.invitationId)
      .eq("workspace_id", auth.workspace.id)
      .eq("status", "pending")
      .select("*")
      .single<WorkspaceInvitationRow>();

    if (updateError || !invitation) {
      console.error("workspace_invitation_revoke_error", updateError);
      return errorResponse(404, "invitation_not_found", "No se encontro una invitacion pendiente.");
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona una invitacion valida.");
    }

    console.error("workspace_invitation_revoke_unhandled", error);
    return errorResponse(500, "invitation_revoke_failed", "No se pudo revocar la invitacion.");
  }
}

async function requireWorkspaceAdmin(workspaceIdParam: string) {
  const { supabase, user } = await requireUser();

  if (!supabase || !user) {
    return errorResponse(401, "unauthorized", "Inicia sesion para gestionar invitaciones.");
  }

  const { id } = paramsSchema.parse({ id: workspaceIdParam });
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    console.error("workspace_invitation_profile_error", profileError);
    return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
  }

  if (profile.plan !== "empresa" && profile.role !== "admin") {
    return errorResponse(403, "empresa_required", "Las invitaciones estan disponibles en el plan Empresa.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single<WorkspaceRow>();

  if (workspaceError || !workspace) {
    console.error("workspace_invitation_workspace_error", workspaceError);
    return errorResponse(404, "workspace_not_found", "No se encontro el workspace.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single<WorkspaceMemberRow>();

  if (membershipError || !membership || !canInviteMembers(membership, profile)) {
    return errorResponse(403, "workspace_invite_required", "No tienes permiso para gestionar invitaciones.");
  }

  return { supabase, user, profile, workspace, membership };
}
