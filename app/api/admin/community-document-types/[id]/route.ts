import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSupabaseServiceClient,
  requireUser,
  type CommunityDocumentTypeRow,
  type Profile,
} from "@/lib/supabase-server";

const communityTypeUpdateSchema = z.object({
  label: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(1200),
  category: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["draft", "reviewing", "approved", "published", "rejected"]),
  required_plan: z.enum(["free", "pro", "empresa"]),
  prompt_brief: z.string().trim().min(20).max(6000),
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
      return errorResponse(401, "unauthorized", "Inicia sesión para editar candidatos.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || profile?.role !== "admin") {
      return errorResponse(403, "admin_required", "Solo un administrador puede editar candidatos.");
    }

    const payload = communityTypeUpdateSchema.parse(await request.json());
    const db = createSupabaseServiceClient() || supabase;
    const { data, error } = await db
      .from("community_document_types")
      .update({
        label: payload.label,
        description: payload.description,
        category: payload.category || null,
        status: payload.status,
        required_plan: payload.required_plan,
        prompt_brief: payload.prompt_brief,
        admin_notes: payload.admin_notes || null,
      })
      .eq("id", params.id)
      .select("*")
      .single<CommunityDocumentTypeRow>();

    if (error || !data) {
      console.error("community_type_update_error", error);
      return errorResponse(500, "community_type_update_failed", "No se pudo actualizar el candidato.");
    }

    return NextResponse.json({ candidate: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos del candidato.");
    }

    console.error("community_type_update_unhandled", error);
    return errorResponse(500, "community_type_update_failed", "No se pudo actualizar el candidato.");
  }
}
