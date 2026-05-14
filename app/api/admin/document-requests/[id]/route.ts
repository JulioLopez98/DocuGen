import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type DocumentRequestRow, type Profile } from "@/lib/supabase-server";

const requestUpdateSchema = z.object({
  status: z.enum(["submitted", "reviewing", "approved", "rejected", "converted"]),
  admin_notes: z.string().trim().max(3000).optional().nullable(),
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
      return errorResponse(401, "unauthorized", "Inicia sesión para editar solicitudes.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || profile?.role !== "admin") {
      return errorResponse(403, "admin_required", "Solo un administrador puede editar solicitudes.");
    }

    const payload = requestUpdateSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const { data, error } = await db
      .from("document_requests")
      .update({
        status: payload.status,
        admin_notes: payload.admin_notes || null,
      })
      .eq("id", params.id)
      .select("*")
      .single<DocumentRequestRow>();

    if (error || !data) {
      console.error("admin_document_request_update_error", error);
      return errorResponse(500, "request_update_failed", "No se pudo actualizar la solicitud.");
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa el estado y las notas internas.");
    }

    console.error("admin_document_request_update_unhandled", error);
    return errorResponse(500, "request_update_failed", "No se pudo actualizar la solicitud.");
  }
}
