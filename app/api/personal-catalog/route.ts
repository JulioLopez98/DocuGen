import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type CommunityDocumentTypeRow, type DocumentRow, type Profile } from "@/lib/supabase-server";

const saveCatalogSchema = z.object({
  documentId: z.string().uuid(),
  label: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).optional(),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para guardar en Mi catálogo.");
    }

    const payload = saveCatalogSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    if (profile.plan === "free") {
      return errorResponse(403, "pro_required", "Guardar tipos en Mi catálogo está disponible en Pro.");
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", payload.documentId)
      .eq("user_id", user.id)
      .single<DocumentRow>();

    if (documentError || !document) {
      return errorResponse(404, "document_not_found", "No se encontró el documento.");
    }

    if (!canSaveAsCatalogType(document.doc_type)) {
      return errorResponse(400, "unsupported_document", "Solo puedes guardar documentos a medida o del asistente en Mi catálogo.");
    }

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "Falta configurar permisos de servidor para guardar en Mi catálogo.");
    }

    const label = normalizeLabel(payload.label || document.doc_label || "Documento personalizado");
    const description = payload.description?.trim() || buildDescription(document);
    const promptBrief = buildPromptBrief(document, label, description);

    const { data: existing } = await db
      .from("community_document_types")
      .select("*")
      .eq("created_by", user.id)
      .eq("label", label)
      .maybeSingle<CommunityDocumentTypeRow>();

    if (existing) {
      return NextResponse.json({ catalogType: existing, alreadyExists: true });
    }

    const slug = await buildUniqueSlug(db, label);
    const { data: catalogType, error: insertError } = await db
      .from("community_document_types")
      .insert({
        source_request_id: null,
        created_by: user.id,
        slug,
        label,
        description,
        category: "Mi catálogo",
        status: "published",
        required_plan: "pro",
        prompt_brief: promptBrief,
        suggested_fields: buildSuggestedFields(document),
        admin_notes: `Creado por el usuario desde el documento ${document.id}.`,
      })
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (insertError || !catalogType) {
      console.error("personal_catalog_insert_error", insertError);
      return errorResponse(500, "catalog_save_failed", "No se pudo guardar en Mi catálogo.");
    }

    return NextResponse.json({ catalogType, alreadyExists: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el nombre del tipo que quieres guardar.");
    }

    console.error("personal_catalog_save_unhandled", error);
    return errorResponse(500, "catalog_save_failed", "No se pudo guardar en Mi catálogo.");
  }
}

function canSaveAsCatalogType(docType: string) {
  return docType === "custom" || docType === "assistant";
}

function normalizeLabel(value: string) {
  const clean = value.trim().replace(/\s+/g, " ").replace(/^borrador de\s+/i, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function buildDescription(document: DocumentRow) {
  const firstContentLine = document.content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("**"));
  const fallback = firstContentLine || "Tipo personalizado guardado a partir de un documento generado por DocuGen.";
  return fallback.length > 260 ? `${fallback.slice(0, 257)}...` : fallback;
}

function buildPromptBrief(document: DocumentRow, label: string, description: string) {
  return [
    `Tipo personalizado del usuario: ${label}.`,
    `Descripción: ${description}`,
    "Genera un borrador profesional para España siguiendo la intención del tipo guardado.",
    "Usa los datos proporcionados por el usuario como prioridad y no inventes información.",
    "Si falta información, usa marcadores [PENDIENTE DE COMPLETAR].",
    "Mantén un tono profesional, claro y revisable.",
    "Ejemplo de referencia del tipo:",
    document.content.slice(0, 2600),
  ].join("\n");
}

function buildSuggestedFields(document: DocumentRow) {
  const fields = [
    { name: "contexto", label: "Contexto del documento", type: "textarea" },
    { name: "partes_implicadas", label: "Partes implicadas", type: "textarea" },
    { name: "datos_clave", label: "Datos clave", type: "textarea" },
    { name: "condiciones", label: "Condiciones o puntos importantes", type: "textarea" },
    { name: "fecha", label: "Fecha", type: "date" },
    { name: "observaciones", label: "Observaciones adicionales", type: "textarea" },
  ] as const;

  const existingKeys = new Set(Object.keys(document.form_data || {}));
  const extraFields = Array.from(existingKeys)
    .filter((key) => key && !key.startsWith("__") && !fields.some((field) => field.name === key))
    .slice(0, 4)
    .map((key) => ({ name: key, label: toFieldLabel(key), type: "textarea" as const }));

  return [...fields, ...extraFields];
}

function toFieldLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
