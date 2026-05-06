import { NextResponse } from "next/server";
import { requireUser, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para exportar a Word.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (!profile || profile.plan === "free") {
      return errorResponse(403, "pro_required", "La exportación Word estará disponible para planes Pro.");
    }

    return errorResponse(501, "not_implemented", "La exportación .docx está preparada para Fase 2.");
  } catch (error) {
    console.error("docx_export_error", error);
    return errorResponse(500, "docx_export_failed", "No se pudo preparar la exportación Word.");
  }
}
