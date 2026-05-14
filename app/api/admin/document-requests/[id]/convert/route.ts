import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseServiceClient,
  requireUser,
  type CommunityDocumentTypeRow,
  type DocumentRequestRow,
  type Profile,
} from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

type SuggestedField = CommunityDocumentTypeRow["suggested_fields"][number];

export async function POST(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para convertir solicitudes.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || profile?.role !== "admin") {
      return errorResponse(403, "admin_required", "Solo un administrador puede convertir solicitudes.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { data: sourceRequest, error: requestError } = await db
      .from("document_requests")
      .select("*")
      .eq("id", params.id)
      .single<DocumentRequestRow>();

    if (requestError || !sourceRequest) {
      console.error("community_candidate_request_error", requestError);
      return errorResponse(404, "request_not_found", "No se encontró la solicitud.");
    }

    const { data: existingCandidate } = await db
      .from("community_document_types")
      .select("*")
      .eq("source_request_id", sourceRequest.id)
      .maybeSingle<CommunityDocumentTypeRow>();

    if (existingCandidate) {
      await markRequestConverted(db, sourceRequest, existingCandidate.label);
      return NextResponse.json({ candidate: existingCandidate, alreadyExists: true });
    }

    const candidatePayload = buildCandidatePayload(sourceRequest, user.id);
    const { data: candidate, error: insertError } = await db
      .from("community_document_types")
      .insert(candidatePayload)
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (insertError || !candidate) {
      console.error("community_candidate_insert_error", insertError);
      return errorResponse(500, "candidate_create_failed", "No se pudo crear el documento candidato.");
    }

    await markRequestConverted(db, sourceRequest, candidate.label);

    return NextResponse.json({ candidate, alreadyExists: false });
  } catch (error) {
    console.error("community_candidate_unhandled", error);
    return errorResponse(500, "candidate_create_failed", "No se pudo crear el documento candidato.");
  }
}

function buildCandidatePayload(sourceRequest: DocumentRequestRow, adminUserId: string) {
  const label = normalizeLabel(sourceRequest.title);
  const category = inferCategory(sourceRequest);
  const slug = buildSlug(label);
  const suggestedFields = buildSuggestedFields(sourceRequest);
  const promptBrief = [
    `Documento solicitado por usuarios: ${sourceRequest.title}.`,
    `Descripción original: ${sourceRequest.description}`,
    sourceRequest.intended_use ? `Uso previsto: ${sourceRequest.intended_use}` : "",
    sourceRequest.sector ? `Sector: ${sourceRequest.sector}` : "",
    `Tono solicitado: ${sourceRequest.tone}.`,
    "Redactar para España, como borrador profesional revisable, sin prometer validez legal definitiva.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    source_request_id: sourceRequest.id,
    created_by: adminUserId,
    slug,
    label,
    description: summarizeDescription(sourceRequest.description),
    category,
    status: "draft",
    required_plan: "pro",
    prompt_brief: promptBrief,
    suggested_fields: suggestedFields,
    admin_notes: sourceRequest.admin_notes,
  };
}

async function markRequestConverted(
  db: SupabaseClient,
  sourceRequest: DocumentRequestRow,
  candidateLabel: string,
) {
  const conversionNote = `Convertida en candidato: ${candidateLabel}`;
  const nextNotes = sourceRequest.admin_notes?.includes(conversionNote)
    ? sourceRequest.admin_notes
    : [sourceRequest.admin_notes, conversionNote].filter(Boolean).join("\n");

  const { error } = await db
    .from("document_requests")
    .update({
      status: "converted",
      admin_notes: nextNotes,
    })
    .eq("id", sourceRequest.id);

  if (error) {
    console.error("community_candidate_request_update_error", error);
  }
}

function normalizeLabel(title: string) {
  const cleaned = title.trim().replace(/\s+/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function buildSlug(label: string) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return `${base || "documento-candidato"}-${Date.now().toString(36)}`;
}

function summarizeDescription(description: string) {
  const normalized = description.trim().replace(/\s+/g, " ");
  return normalized.length > 260 ? `${normalized.slice(0, 257)}...` : normalized;
}

function inferCategory(sourceRequest: DocumentRequestRow) {
  const text = `${sourceRequest.title} ${sourceRequest.description} ${sourceRequest.sector || ""}`.toLowerCase();

  if (/(laboral|empleado|trabajador|nomina|despido|baja|rrhh|recurso humano)/.test(text)) {
    return "Laboral";
  }

  if (/(web|privacidad|cookies|ecommerce|tienda|datos|rgpd|newsletter)/.test(text)) {
    return "Web";
  }

  if (/(contrato|acuerdo|nda|legal|clausula|reclamacion|jurisdiccion|arrendamiento)/.test(text)) {
    return "Legal";
  }

  if (/(presupuesto|propuesta|cliente|proveedor|venta|compra|comercial)/.test(text)) {
    return "Comercial";
  }

  return sourceRequest.sector || "A medida";
}

function buildSuggestedFields(sourceRequest: DocumentRequestRow): SuggestedField[] {
  const baseFields: SuggestedField[] = [
    { name: "contexto", label: "Contexto del documento", type: "textarea" },
    { name: "partes_implicadas", label: "Partes implicadas", type: "textarea" },
    { name: "datos_clave", label: "Datos clave", type: "textarea" },
    { name: "condiciones", label: "Condiciones o puntos importantes", type: "textarea" },
    { name: "fecha", label: "Fecha", type: "date" },
  ];

  if (sourceRequest.intended_use) {
    baseFields.push({ name: "uso_previsto", label: "Uso previsto", type: "textarea" });
  }

  if (sourceRequest.sector) {
    baseFields.push({ name: "sector", label: "Sector", type: "text" });
  }

  baseFields.push({ name: "observaciones", label: "Observaciones adicionales", type: "textarea" });

  return baseFields;
}
