import { NextResponse } from "next/server";
import { runInternalHealthChecks } from "@/lib/health-checks";
import { createSupabaseServiceClient, requireUser, type Profile } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para ver health checks.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || profile?.role !== "admin") {
      return errorResponse(403, "admin_required", "Solo un administrador puede ver health checks.");
    }

    const db = createSupabaseServiceClient() || supabase;
    const report = await runInternalHealthChecks(db);

    return NextResponse.json({ report });
  } catch (error) {
    console.error("admin_health_check_unhandled", error);
    return errorResponse(500, "health_check_failed", "No se pudieron ejecutar los health checks.");
  }
}
