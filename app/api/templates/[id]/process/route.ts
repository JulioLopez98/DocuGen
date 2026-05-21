import { NextResponse } from "next/server";
import { z } from "zod";
import { processTemplateFile } from "@/lib/template-processing";
import { createSupabaseServiceClient, requireUser, type DocumentTemplateRow, type Profile } from "@/lib/supabase-server";
import { recordWorkspaceAuditEvent } from "@/lib/workspace-audit";
import { canUseWorkspace } from "@/lib/workspace-access";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para procesar plantillas.");
    }

    const { id } = paramsSchema.parse(params);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("template_process_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "El procesamiento de plantillas esta disponible solo en DocuGen Pro.");
    }

    const { data: template, error: findError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", id)
      .single<DocumentTemplateRow>();

    if (findError || !template) {
      return errorResponse(404, "template_not_found", "No se encontro la plantilla.");
    }

    if (template.user_id !== user.id) {
      const workspaceAccess = await canUseWorkspace(supabase, user.id, profile, template.workspace_id, "manage_templates");

      if (!workspaceAccess.allowed) {
        return errorResponse(
          workspaceAccess.reason === "permission_denied" ? 403 : 404,
          workspaceAccess.reason || "workspace_denied",
          workspaceAccess.reason === "permission_denied"
            ? "No tienes permiso para procesar plantillas en este workspace."
            : "No tienes acceso a esta plantilla.",
        );
      }
    }

    const db = createSupabaseServiceClient() || supabase;
    await db
      .from("document_templates")
      .update({ status: "processing", error_message: null })
      .eq("id", template.id);

    const { data: file, error: downloadError } = await db.storage.from(template.storage_bucket).download(template.storage_path);

    if (downloadError || !file) {
      console.error("template_process_download_error", downloadError);
      await db
        .from("document_templates")
        .update({ status: "failed", error_message: "No se pudo descargar el archivo original." })
        .eq("id", template.id);

      return errorResponse(500, "template_download_failed", "No se pudo descargar el archivo original.");
    }

    const result = await processTemplateFile(template.file_type, await file.arrayBuffer());
    const suggestedCategory = readString(result.metadata.suggestedCategory);
    const { data: updatedTemplate, error: updateError } = await db
      .from("document_templates")
      .update({
        status: result.status,
        extracted_text: result.text,
        extracted_metadata: result.metadata,
        summary: result.summary,
        category: template.category || suggestedCategory,
        error_message: result.errorMessage,
      })
      .eq("id", template.id)
      .select("*")
      .single<DocumentTemplateRow>();

    if (updateError || !updatedTemplate) {
      console.error("template_process_update_error", updateError);
      return errorResponse(500, "template_process_failed", "No se pudo guardar el resultado del procesamiento.");
    }

    await recordWorkspaceAuditEvent({
      supabase,
      workspaceId: template.workspace_id,
      actorId: user.id,
      eventType: "template_processed",
      targetType: "template",
      targetId: template.id,
      summary: `Proceso la plantilla ${template.name}`,
      metadata: {
        status: result.status,
        words: result.text ? result.text.trim().split(/\s+/).filter(Boolean).length : 0,
      },
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_template_id", "Identificador de plantilla no valido.");
    }

    console.error("template_process_unhandled", error);
    return errorResponse(500, "template_process_failed", "No se pudo procesar la plantilla.");
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}
