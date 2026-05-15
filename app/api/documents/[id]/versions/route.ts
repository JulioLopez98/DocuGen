import { NextResponse } from "next/server";
import { getDocumentVersions } from "@/lib/document-versions";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para ver versiones.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const { data, error } = await getDocumentVersions(db, params.id, user.id);

    if (error) {
      console.error("document_versions_get_error", error);
      return errorResponse(500, "versions_failed", "No se pudieron cargar las versiones.");
    }

    return NextResponse.json({ versions: data || [] });
  } catch (error) {
    console.error("document_versions_get_unhandled", error);
    return errorResponse(500, "versions_failed", "No se pudieron cargar las versiones.");
  }
}
