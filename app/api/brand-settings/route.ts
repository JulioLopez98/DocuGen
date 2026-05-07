import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type BrandSettings, type Profile } from "@/lib/supabase-server";

const brandSchema = z.object({
  company_name: z.string().trim().max(180).optional().nullable(),
  cif: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(260).optional().nullable(),
  logo_url: z.string().trim().url().max(1000).optional().nullable().or(z.literal("")),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para guardar la marca.");
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();

    if (!profile || profile.plan === "free") {
      return errorResponse(403, "pro_required", "La personalización de marca está disponible solo en Pro.");
    }

    const payload = brandSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const { data, error } = await db
      .from("brand_settings")
      .upsert(
        {
          user_id: user.id,
          company_name: payload.company_name || null,
          cif: payload.cif || null,
          address: payload.address || null,
          logo_url: payload.logo_url || null,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single<BrandSettings>();

    if (error || !data) {
      console.error("brand_settings_save_error", error);
      return errorResponse(500, "brand_save_failed", "No se pudieron guardar los ajustes de marca.");
    }

    return NextResponse.json({ brandSettings: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos de marca.");
    }

    console.error("brand_settings_unhandled", error);
    return errorResponse(500, "brand_save_failed", "No se pudieron guardar los ajustes de marca.");
  }
}
