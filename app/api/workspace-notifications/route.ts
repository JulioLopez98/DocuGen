import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser } from "@/lib/supabase-server";

const updateSchema = z
  .object({
    notificationId: z.string().uuid().optional(),
    workspaceId: z.string().uuid().optional(),
    markAll: z.boolean().optional(),
  })
  .refine((payload) => Boolean(payload.notificationId) || Boolean(payload.markAll));

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para gestionar notificaciones.");
    }

    const payload = updateSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const readAt = new Date().toISOString();

    let query = db.from("workspace_notifications").update({ read_at: readAt }).eq("user_id", user.id).is("read_at", null);

    if (payload.notificationId) {
      query = query.eq("id", payload.notificationId);
    }

    if (payload.workspaceId) {
      query = query.eq("workspace_id", payload.workspaceId);
    }

    const { error } = await query;

    if (error) {
      console.error("workspace_notifications_update_error", error);
      return errorResponse(500, "notification_update_failed", "No se pudieron actualizar las notificaciones.");
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos de la notificacion.");
    }

    console.error("workspace_notifications_update_unhandled", error);
    return errorResponse(500, "notification_update_failed", "No se pudieron actualizar las notificaciones.");
  }
}
