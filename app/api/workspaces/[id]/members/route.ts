import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServiceClient,
  requireUser,
  type Profile,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const addMemberSchema = z.object({
  email: z.string().trim().email().max(240),
  role: z.enum(["admin", "member"]).default("member"),
});

const updateMemberSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

const deleteMemberSchema = z.object({
  memberId: z.string().uuid(),
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

    const payload = addMemberSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || auth.supabase;
    const { data: targetProfile, error: targetError } = await db
      .from("profiles")
      .select("*")
      .ilike("email", payload.email)
      .maybeSingle<Profile>();

    if (targetError) {
      console.error("workspace_member_target_error", targetError);
      return errorResponse(500, "member_lookup_failed", "No se pudo buscar ese usuario.");
    }

    if (!targetProfile) {
      return errorResponse(404, "user_not_found", "Ese email todavia no tiene cuenta en DocuGen.");
    }

    const { data: member, error: insertError } = await db
      .from("workspace_members")
      .insert({
        workspace_id: auth.workspace.id,
        user_id: targetProfile.id,
        role: payload.role,
      })
      .select("*")
      .single<WorkspaceMemberRow>();

    if (insertError || !member) {
      console.error("workspace_member_insert_error", insertError);
      return errorResponse(
        insertError?.code === "23505" ? 409 : 500,
        "member_add_failed",
        "No se pudo añadir el miembro. Puede que ya exista.",
      );
    }

    return NextResponse.json({ member, profile: { id: targetProfile.id, email: targetProfile.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el email y el rol.");
    }

    console.error("workspace_member_add_unhandled", error);
    return errorResponse(500, "member_add_failed", "No se pudo añadir el miembro.");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireWorkspaceAdmin(params.id);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const payload = updateMemberSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || auth.supabase;
    const { data: memberToUpdate, error: findError } = await db
      .from("workspace_members")
      .select("*")
      .eq("id", payload.memberId)
      .eq("workspace_id", auth.workspace.id)
      .single<WorkspaceMemberRow>();

    if (findError || !memberToUpdate) {
      return errorResponse(404, "member_not_found", "No se encontro ese miembro.");
    }

    if (memberToUpdate.user_id === auth.workspace.owner_id && payload.role !== "admin") {
      return errorResponse(400, "owner_must_be_admin", "El propietario del workspace debe seguir siendo admin.");
    }

    const { data: member, error: updateError } = await db
      .from("workspace_members")
      .update({ role: payload.role })
      .eq("id", payload.memberId)
      .eq("workspace_id", auth.workspace.id)
      .select("*")
      .single<WorkspaceMemberRow>();

    if (updateError || !member) {
      console.error("workspace_member_update_error", updateError);
      return errorResponse(500, "member_update_failed", "No se pudo actualizar el miembro.");
    }

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el miembro y el rol.");
    }

    console.error("workspace_member_update_unhandled", error);
    return errorResponse(500, "member_update_failed", "No se pudo actualizar el miembro.");
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const auth = await requireWorkspaceAdmin(params.id);

    if (auth instanceof NextResponse) {
      return auth;
    }

    const payload = deleteMemberSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || auth.supabase;
    const { data: memberToDelete, error: findError } = await db
      .from("workspace_members")
      .select("*")
      .eq("id", payload.memberId)
      .eq("workspace_id", auth.workspace.id)
      .single<WorkspaceMemberRow>();

    if (findError || !memberToDelete) {
      return errorResponse(404, "member_not_found", "No se encontro ese miembro.");
    }

    if (memberToDelete.user_id === auth.workspace.owner_id) {
      return errorResponse(400, "owner_cannot_be_removed", "No puedes quitar al propietario del workspace.");
    }

    const { error: deleteError } = await db
      .from("workspace_members")
      .delete()
      .eq("id", payload.memberId)
      .eq("workspace_id", auth.workspace.id);

    if (deleteError) {
      console.error("workspace_member_delete_error", deleteError);
      return errorResponse(500, "member_delete_failed", "No se pudo quitar el miembro.");
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona un miembro valido.");
    }

    console.error("workspace_member_delete_unhandled", error);
    return errorResponse(500, "member_delete_failed", "No se pudo quitar el miembro.");
  }
}

async function requireWorkspaceAdmin(workspaceIdParam: string) {
  const { supabase, user } = await requireUser();

  if (!supabase || !user) {
    return errorResponse(401, "unauthorized", "Inicia sesion para gestionar miembros.");
  }

  const { id } = paramsSchema.parse({ id: workspaceIdParam });
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profileError || !profile) {
    console.error("workspace_member_profile_error", profileError);
    return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
  }

  if (profile.plan !== "empresa" && profile.role !== "admin") {
    return errorResponse(403, "empresa_required", "La gestion de miembros esta disponible en el plan Empresa.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single<WorkspaceRow>();

  if (workspaceError || !workspace) {
    console.error("workspace_member_workspace_error", workspaceError);
    return errorResponse(404, "workspace_not_found", "No se encontro el workspace.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single<WorkspaceMemberRow>();

  if (membershipError || !membership || (membership.role !== "admin" && profile.role !== "admin")) {
    return errorResponse(403, "workspace_admin_required", "Solo un admin del workspace puede gestionar miembros.");
  }

  return { supabase, user, profile, workspace, membership };
}
