import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type CommunityDocumentTypeRow } from "@/lib/supabase-server";

const catalogFieldSchema = z.object({
  name: z.string().trim().min(2).max(60).regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(2).max(90),
  type: z.enum(["text", "textarea", "date", "email", "number"]),
  required: z.boolean().optional().default(false),
  helpText: z.string().trim().max(180).optional().nullable(),
});

const updateCatalogSchema = z.object({
  label: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(500),
  category: z.string().trim().max(80).optional().nullable(),
  suggested_fields: z.array(catalogFieldSchema).min(1).max(18).optional(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { user } = await requireUser();

    if (!user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para editar Mi catálogo.");
    }

    const payload = updateCatalogSchema.parse(await request.json());
    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar permisos de servidor para editar Mi catálogo.");
    }

    const { data, error } = await db
      .from("community_document_types")
      .update({
        label: payload.label,
        description: payload.description,
        category: payload.category || "Mi catálogo",
        ...(payload.suggested_fields ? { suggested_fields: payload.suggested_fields } : {}),
      })
      .eq("id", params.id)
      .eq("created_by", user.id)
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (error || !data) {
      console.error("personal_catalog_update_error", error);
      return errorResponse(404, "catalog_type_not_found", "No se encontró este tipo de Mi catálogo.");
    }

    return NextResponse.json({ catalogType: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el nombre, la descripción y los campos del tipo guardado.");
    }

    console.error("personal_catalog_update_unhandled", error);
    return errorResponse(500, "catalog_update_failed", "No se pudo actualizar Mi catálogo.");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { user } = await requireUser();

    if (!user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para borrar de Mi catálogo.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar permisos de servidor para borrar de Mi catálogo.");
    }

    const { data, error } = await db
      .from("community_document_types")
      .delete()
      .eq("id", params.id)
      .eq("created_by", user.id)
      .select("id")
      .single<{ id: string }>();

    if (error || !data) {
      console.error("personal_catalog_delete_error", error);
      return errorResponse(404, "catalog_type_not_found", "No se encontró este tipo de Mi catálogo.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("personal_catalog_delete_unhandled", error);
    return errorResponse(500, "catalog_delete_failed", "No se pudo borrar de Mi catálogo.");
  }
}
