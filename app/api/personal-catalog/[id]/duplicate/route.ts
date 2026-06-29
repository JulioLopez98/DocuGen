import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
      return errorResponse(401, "unauthorized", "Inicia sesión para duplicar tipos de Mi catálogo.");
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
      return errorResponse(403, "pro_required", "Duplicar tipos de Mi catálogo está disponible en Pro y Empresa.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar permisos de servidor para editar Mi catálogo.");
    }

    const { data: sourceType, error: sourceError } = await db
      .from("community_document_types")
      .select("*")
      .eq("id", params.id)
      .eq("created_by", user.id)
      .single<CommunityDocumentTypeRow>();

    if (sourceError || !sourceType) {
      return errorResponse(404, "catalog_type_not_found", "No se encontró este tipo de Mi catálogo.");
    }

    const label = await buildDuplicateLabel(db, sourceType.label, user.id);
    const slug = await buildUniqueSlug(db, label);

    const { data: duplicatedType, error: insertError } = await db
      .from("community_document_types")
      .insert({
        source_request_id: null,
        created_by: user.id,
        slug,
        label,
        description: sourceType.description,
        category: sourceType.category || "Mi catálogo",
        status: "published",
        required_plan: sourceType.required_plan,
        prompt_brief: sourceType.prompt_brief,
        suggested_fields: sourceType.suggested_fields,
        admin_notes: [sourceType.admin_notes, `Duplicado desde el tipo ${sourceType.id}.`].filter(Boolean).join("\n"),
      })
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (insertError || !duplicatedType) {
      console.error("personal_catalog_duplicate_insert_error", insertError);
      return errorResponse(500, "catalog_duplicate_failed", "No se pudo duplicar este tipo de Mi catálogo.");
    }

    return NextResponse.json({ catalogType: duplicatedType });
  } catch (error) {
    console.error("personal_catalog_duplicate_unhandled", error);
    return errorResponse(500, "catalog_duplicate_failed", "No se pudo duplicar este tipo de Mi catálogo.");
  }
}

async function buildDuplicateLabel(db: SupabaseClient, sourceLabel: string, userId: string) {
  const base = sourceLabel.replace(/\s\(copia(?: \d+)?\)$/i, "").trim() || "Tipo personalizado";

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const label = attempt === 1 ? `${base} (copia)` : `${base} (copia ${attempt})`;
    const { data } = await db
      .from("community_document_types")
      .select("id")
      .eq("created_by", userId)
      .eq("label", label)
      .maybeSingle<{ id: string }>();

    if (!data) {
      return label;
    }
  }

  return `${base} (copia ${crypto.randomUUID().slice(0, 4)})`;
}

async function buildUniqueSlug(db: SupabaseClient, label: string) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 62) || "tipo-personalizado";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = attempt === 0 ? Date.now().toString(36) : `${Date.now().toString(36)}-${attempt}`;
    const slug = `${base}-${suffix}`;
    const { data } = await db
      .from("community_document_types")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (!data) {
      return slug;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
