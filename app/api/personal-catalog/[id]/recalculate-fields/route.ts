import { NextResponse } from "next/server";
import { inferCatalogFieldsFromType } from "@/lib/catalog-fields";
import { createSupabaseServiceClient, requireUser, type CommunityDocumentTypeRow, type Profile } from "@/lib/supabase-server";

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
      return errorResponse(401, "unauthorized", "Inicia sesión para recalcular campos de Mi catálogo.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single<Pick<Profile, "plan">>();

    if (profileError || !profile) {
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "Recalcular campos con IA está disponible en Pro y Empresa.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar permisos de servidor para editar Mi catálogo.");
    }

    const { data: catalogType, error: catalogError } = await db
      .from("community_document_types")
      .select("*")
      .eq("id", params.id)
      .eq("created_by", user.id)
      .single<CommunityDocumentTypeRow>();

    if (catalogError || !catalogType) {
      return errorResponse(404, "catalog_type_not_found", "No se encontró este tipo de Mi catálogo.");
    }

    const recalculatedFields = await inferCatalogFieldsFromType(catalogType);

    const { data: updatedType, error: updateError } = await db
      .from("community_document_types")
      .update({ suggested_fields: recalculatedFields })
      .eq("id", catalogType.id)
      .eq("created_by", user.id)
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (updateError || !updatedType) {
      console.error("personal_catalog_recalculate_update_error", updateError);
      return errorResponse(500, "catalog_recalculate_failed", "No se pudieron guardar los campos recalculados.");
    }

    return NextResponse.json({ catalogType: updatedType, fields: updatedType.suggested_fields });
  } catch (error) {
    console.error("personal_catalog_recalculate_unhandled", error);
    return errorResponse(500, "catalog_recalculate_failed", "No se pudieron recalcular los campos.");
  }
}
