import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServiceClient,
  requireUser,
  type DocumentTemplateRow,
  type Profile,
} from "@/lib/supabase-server";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { canUseWorkspace } from "@/lib/workspace-access";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const templateUpdateSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    variables: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          source: z.enum(["placeholder", "label", "manual"]).default("manual"),
          confidence: z.enum(["high", "medium", "manual"]).default("manual"),
        }),
      )
      .max(60)
      .optional(),
  })
  .refine((payload) => payload.isFavorite !== undefined || payload.variables !== undefined);

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para borrar plantillas.");
    }

    const { id } = paramsSchema.parse(params);
    const access = await requireTemplateManager(supabase, user.id, id);

    if (access instanceof NextResponse) {
      return access;
    }

    const db = createSupabaseServiceClient() || supabase;
    const { error: storageError } = await db.storage
      .from(access.template.storage_bucket)
      .remove([access.template.storage_path]);

    if (storageError) {
      console.error("template_storage_delete_error", storageError);
      return errorResponse(500, "template_delete_failed", "No se pudo borrar el archivo de la plantilla.");
    }

    const { error: deleteError } = await db.from("document_templates").delete().eq("id", id);

    if (deleteError) {
      console.error("template_delete_error", deleteError);
      return errorResponse(500, "template_delete_failed", "No se pudo borrar la plantilla.");
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: access.template.workspace_id,
      actorId: user.id,
      eventType: "template_deleted",
      targetType: "template",
      targetId: access.template.id,
      summary: `Borro la plantilla ${access.template.name}`,
      metadata: {
        originalFilename: access.template.original_filename,
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_template_id", "Identificador de plantilla no valido.");
    }

    console.error("template_delete_unhandled", error);
    return errorResponse(500, "template_delete_failed", "No se pudo borrar la plantilla.");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para actualizar plantillas.");
    }

    const { id } = paramsSchema.parse(params);
    const payload = templateUpdateSchema.parse(await request.json());
    const access = await requireTemplateManager(supabase, user.id, id);

    if (access instanceof NextResponse) {
      return access;
    }

    const updatePayload: {
      is_favorite?: boolean;
      extracted_metadata?: Record<string, unknown>;
    } = {};

    if (payload.isFavorite !== undefined) {
      updatePayload.is_favorite = payload.isFavorite;
    }

    if (payload.variables !== undefined) {
      updatePayload.extracted_metadata = {
        ...(access.template.extracted_metadata || {}),
        variables: dedupeVariables(payload.variables),
        variablesUpdatedAt: new Date().toISOString(),
        variablesReviewed: true,
      };
    }

    const { data: template, error: updateError } = await supabase
      .from("document_templates")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single<DocumentTemplateRow>();

    if (updateError || !template) {
      console.error("template_update_error", updateError);
      return errorResponse(404, "template_not_found", "No se encontro la plantilla.");
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: template.workspace_id,
      actorId: user.id,
      eventType: "template_updated",
      targetType: "template",
      targetId: template.id,
      summary: `Actualizo la plantilla ${template.name}`,
      metadata: {
        changedFavorite: payload.isFavorite !== undefined,
        changedVariables: payload.variables !== undefined,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos de la plantilla.");
    }

    console.error("template_update_unhandled", error);
    return errorResponse(500, "template_update_failed", "No se pudo actualizar la plantilla.");
  }
}

async function requireTemplateManager(
  supabase: NonNullable<Awaited<ReturnType<typeof requireUser>>["supabase"]>,
  userId: string,
  templateId: string,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (profileError || !profile) {
    console.error("template_manager_profile_error", profileError);
    return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
  }

  const { data: template, error: findError } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", templateId)
    .single<DocumentTemplateRow>();

  if (findError || !template) {
    console.error("template_manager_find_error", findError);
    return errorResponse(404, "template_not_found", "No se encontro la plantilla.");
  }

  if (template.user_id === userId) {
    return { template, profile };
  }

  const workspaceAccess = await canUseWorkspace(supabase, userId, profile, template.workspace_id, "manage_templates");

  if (!workspaceAccess.allowed) {
    return errorResponse(
      workspaceAccess.reason === "permission_denied" ? 403 : 404,
      workspaceAccess.reason || "workspace_denied",
      workspaceAccess.reason === "permission_denied"
        ? "No tienes permiso para gestionar plantillas en este workspace."
        : "No tienes acceso a esta plantilla.",
    );
  }

  return { template, profile };
}

function dedupeVariables(
  variables: Array<{ name: string; source: "placeholder" | "label" | "manual"; confidence: "high" | "medium" | "manual" }>,
) {
  const seen = new Set<string>();

  return variables.filter((variable) => {
    const key = variable.name.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
