import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, type DocumentTemplateRow, type Profile } from "@/lib/supabase-server";
import { canUseWorkspace } from "@/lib/workspace-access";

const TEMPLATE_BUCKET = "document-templates";

const templateCreateSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(600).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  originalFilename: z.string().trim().min(1).max(260),
  fileType: z.enum(["pdf", "docx", "doc"]),
  mimeType: z.string().trim().max(160).optional().nullable(),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024).optional().nullable(),
  storagePath: z.string().trim().min(3).max(700),
  workspaceId: z.string().uuid().optional().nullable(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para ver tus plantillas.");
    }

    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<DocumentTemplateRow[]>();

    if (error) {
      console.error("templates_list_error", error);
      return errorResponse(500, "templates_list_failed", "No se pudieron cargar tus plantillas.");
    }

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    console.error("templates_list_unhandled", error);
    return errorResponse(500, "templates_list_failed", "No se pudieron cargar tus plantillas.");
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para guardar plantillas.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("template_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "La biblioteca de plantillas está disponible solo en DocuGen Pro.");
    }

    const payload = templateCreateSchema.parse(await request.json());
    const workspaceAccess = await canUseWorkspace(supabase, user.id, profile, payload.workspaceId);

    if (!workspaceAccess.allowed) {
      const reason = workspaceAccess.reason || "not_member";
      return errorResponse(
        reason === "empresa_required" ? 403 : 404,
        reason,
        reason === "empresa_required"
          ? "Guardar plantillas en workspace esta disponible en el plan Empresa."
          : "No tienes acceso a ese workspace.",
      );
    }

    if (!payload.storagePath.startsWith(`${user.id}/`)) {
      return errorResponse(400, "invalid_storage_path", "La ruta del archivo no pertenece a tu cuenta.");
    }

    const { data, error } = await supabase
      .from("document_templates")
      .insert({
        user_id: user.id,
        workspace_id: workspaceAccess.workspaceId,
        name: payload.name,
        description: payload.description || null,
        category: payload.category || null,
        original_filename: payload.originalFilename,
        file_type: payload.fileType,
        mime_type: payload.mimeType || null,
        file_size: payload.fileSize || null,
        storage_bucket: TEMPLATE_BUCKET,
        storage_path: payload.storagePath,
        status: "uploaded",
      })
      .select("*")
      .single<DocumentTemplateRow>();

    if (error || !data) {
      console.error("template_create_error", error);
      return errorResponse(500, "template_create_failed", "No se pudo guardar la plantilla.");
    }

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos de la plantilla.");
    }

    console.error("template_create_unhandled", error);
    return errorResponse(500, "template_create_failed", "No se pudo guardar la plantilla.");
  }
}
