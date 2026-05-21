import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServiceClient,
  requireUser,
  type WorkspaceInvitationRow,
  type WorkspaceMemberRow,
} from "@/lib/supabase-server";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { hashInvitationToken } from "@/lib/workspace-invitations";

const acceptInvitationSchema = z.object({
  token: z.string().min(32).max(256),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { user } = await requireUser();

    if (!user?.email) {
      return errorResponse(401, "unauthorized", "Inicia sesion con el email invitado para aceptar.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar SUPABASE_SERVICE_ROLE_KEY.");
    }

    const payload = acceptInvitationSchema.parse(await request.json());
    const tokenHash = hashInvitationToken(payload.token);
    const { data: invitation, error: invitationError } = await db
      .from("workspace_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "pending")
      .maybeSingle<WorkspaceInvitationRow>();

    if (invitationError) {
      console.error("workspace_invitation_accept_lookup_error", invitationError);
      return errorResponse(500, "invitation_lookup_failed", "No se pudo comprobar la invitacion.");
    }

    if (!invitation) {
      return errorResponse(404, "invitation_not_found", "La invitacion no existe o ya no esta disponible.");
    }

    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await db.from("workspace_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return errorResponse(410, "invitation_expired", "La invitacion ha caducado. Pide una nueva.");
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return errorResponse(403, "email_mismatch", "Debes iniciar sesion con el email al que se envio la invitacion.");
    }

    const { data: member, error: memberError } = await db
      .from("workspace_members")
      .upsert(
        {
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role,
          ...getDefaultPermissions(invitation.role),
        },
        { onConflict: "workspace_id,user_id" },
      )
      .select("*")
      .single<WorkspaceMemberRow>();

    if (memberError || !member) {
      console.error("workspace_invitation_accept_member_error", memberError);
      return errorResponse(500, "member_create_failed", "No se pudo unirte al workspace.");
    }

    const { error: updateError } = await db
      .from("workspace_invitations")
      .update({
        status: "accepted",
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("workspace_invitation_accept_update_error", updateError);
    }

    await recordWorkspaceAuditEvent({
      workspaceId: invitation.workspace_id,
      actorId: user.id,
      eventType: "member_joined",
      targetType: "member",
      targetId: member.id,
      summary: `${user.email} acepto la invitacion`,
      metadata: {
        role: invitation.role,
        invitationId: invitation.id,
      },
    });

    return NextResponse.json({ member, workspaceId: invitation.workspace_id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "La invitacion no es valida.");
    }

    console.error("workspace_invitation_accept_unhandled", error);
    return errorResponse(500, "invitation_accept_failed", "No se pudo aceptar la invitacion.");
  }
}

function getDefaultPermissions(role: "admin" | "member") {
  if (role === "admin") {
    return {
      can_create_documents: true,
      can_upload_templates: true,
      can_manage_templates: true,
      can_invite_members: true,
    };
  }

  return {
    can_create_documents: true,
    can_upload_templates: false,
    can_manage_templates: false,
    can_invite_members: false,
  };
}
