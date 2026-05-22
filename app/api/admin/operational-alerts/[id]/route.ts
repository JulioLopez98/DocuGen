import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type Profile } from "@/lib/supabase-server";
import type { OperationalAlertRow } from "@/lib/operational-alerts";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]),
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
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para gestionar alertas.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || profile?.role !== "admin") {
      return errorResponse(403, "admin_required", "Solo un administrador puede gestionar alertas.");
    }

    const { id } = paramsSchema.parse(params);
    const payload = updateSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const updatePayload =
      payload.status === "resolved"
        ? { status: payload.status, resolved_at: new Date().toISOString(), resolved_by: user.id }
        : { status: payload.status, resolved_at: null, resolved_by: null };

    const { data: alert, error } = await db
      .from("operational_alerts")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single<OperationalAlertRow>();

    if (error || !alert) {
      console.error("operational_alert_update_error", error);
      return errorResponse(404, "alert_not_found", "No se encontro la alerta.");
    }

    return NextResponse.json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona una alerta valida.");
    }

    console.error("operational_alert_update_unhandled", error);
    return errorResponse(500, "alert_update_failed", "No se pudo actualizar la alerta.");
  }
}
