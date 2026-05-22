import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCommunityDocumentPrompt, DEFAULT_MODEL, documentInstructions, getOpenAIClient, PREMIUM_MODEL } from "@/lib/openai";
import { checkActionRateLimit, checkGenerationRateLimit, recordActionRateLimitEvent, recordGenerationEvent } from "@/lib/rate-limit";
import { sendDocumentReadyEmail } from "@/lib/resend";
import { requireUser, type CommunityDocumentTypeRow, type Profile } from "@/lib/supabase-server";

const communityGenerateSchema = z.object({
  communityTypeId: z.string().uuid(),
  formData: z.record(z.string(), z.string().trim().max(4000)),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para generar documentos.");
    }

    const payload = communityGenerateSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("community_generate_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    const { data: communityType, error: typeError } = await supabase
      .from("community_document_types")
      .select("*")
      .eq("id", payload.communityTypeId)
      .in("status", ["approved", "published"])
      .single<CommunityDocumentTypeRow>();

    if (typeError || !communityType) {
      console.error("community_type_not_found", typeError);
      return errorResponse(404, "community_type_not_found", "Este documento comunitario no está disponible.");
    }

    if (!canUseCommunityType(profile.plan, communityType.required_plan)) {
      return errorResponse(403, "plan_required", "Este documento comunitario requiere un plan superior.");
    }

    if (profile.plan === "free" && profile.docs_this_month >= 3) {
      return errorResponse(403, "limit_reached", "Has alcanzado el límite de 3 documentos gratuitos este mes.");
    }

    const rateLimit = await checkGenerationRateLimit(supabase, user.id, profile.plan);

    if (!rateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el límite de generaciones por hora.");
    }

    const actionRateLimit = await checkActionRateLimit({
      supabase,
      userId: user.id,
      action: "document_generate",
      userLimit: profile.plan === "free" ? 10 : 80,
    });

    if (!actionRateLimit.allowed) {
      return errorResponse(429, "rate_limit_reached", "Has alcanzado el limite de generaciones por hora.");
    }

    const openai = getOpenAIClient();

    if (!openai) {
      return errorResponse(500, "openai_not_configured", "Configura OPENAI_API_KEY para generar documentos.");
    }

    const model = profile.plan === "free" ? DEFAULT_MODEL : PREMIUM_MODEL;
    const response = await openai.responses.create({
      model,
      instructions: documentInstructions,
      input: buildCommunityDocumentPrompt({
        type: communityType,
        formData: payload.formData,
      }),
      temperature: 0.3,
      max_output_tokens: 4000,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return errorResponse(502, "empty_generation", "La IA no devolvió contenido. Inténtalo de nuevo.");
    }

    const formData = {
      ...payload.formData,
      __community_type: JSON.stringify({
        id: communityType.id,
        slug: communityType.slug,
        label: communityType.label,
        requiredPlan: communityType.required_plan,
      }),
    };
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        doc_type: `community:${communityType.slug}`,
        doc_label: communityType.label,
        content,
        form_data: formData,
        model_used: model,
        tokens_input: response.usage?.input_tokens ?? null,
        tokens_output: response.usage?.output_tokens ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertError || !document) {
      console.error("community_document_insert_error", insertError);
      return errorResponse(500, "document_save_failed", "No se pudo guardar el documento.");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ docs_this_month: profile.docs_this_month + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error("community_profile_update_error", updateError);
    }

    await recordGenerationEvent(supabase, user.id);
    await recordActionRateLimitEvent(supabase, {
      userId: user.id,
      action: "document_generate",
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendDocumentReadyEmail({
        to: user.email,
        documentTitle: communityType.label,
        documentUrl: `${appUrl}/historial/${document.id}`,
      });
    } catch (emailError) {
      console.error("community_document_ready_email_error", emailError);
    }

    return NextResponse.json({
      id: document.id,
      docType: `community:${communityType.slug}`,
      docLabel: communityType.label,
      content,
      formData,
      modelUsed: model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Revisa los datos del formulario.");
    }

    console.error("community_generate_error", error);
    return errorResponse(500, "generation_failed", "No se pudo generar el documento comunitario.");
  }
}

function canUseCommunityType(userPlan: Profile["plan"], requiredPlan: CommunityDocumentTypeRow["required_plan"]) {
  const rank: Record<Profile["plan"], number> = {
    free: 0,
    pro: 1,
    empresa: 2,
  };

  return rank[userPlan] >= rank[requiredPlan];
}
