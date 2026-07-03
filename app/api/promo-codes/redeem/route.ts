import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient, requireUser, type Profile } from "@/lib/supabase-server";

type PromoCodeRow = {
  id: string;
  code: string;
  plan: "pro" | "empresa";
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: string | null;
  note: string | null;
};

const redeemSchema = z.object({
  code: z.string().trim().min(3).max(80),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para aplicar un código.");
    }

    const payload = redeemSchema.parse(await request.json());
    const normalizedCode = normalizePromoCode(payload.code);

    const db = createSupabaseServiceClient();

    if (!db) {
      return errorResponse(500, "service_role_missing", "No se pudo validar el código en este entorno.");
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("promo_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
    }

    if (hasManagedStripeSubscription(profile)) {
      return errorResponse(
        409,
        "stripe_subscription_active",
        "Tu plan se gestiona desde Stripe. Para evitar cobros duplicados, cancela o cambia tu suscripción antes de aplicar un código manual.",
      );
    }

    const { data: promoCode, error: promoError } = await db
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle<PromoCodeRow>();

    if (promoError) {
      console.error("promo_code_find_error", promoError);
      return errorResponse(500, "promo_lookup_failed", "No se pudo validar el código.");
    }

    if (!promoCode || !promoCode.active) {
      return errorResponse(404, "promo_not_found", "El código no existe o ya no está activo.");
    }

    if (promoCode.expires_at && new Date(promoCode.expires_at).getTime() < Date.now()) {
      return errorResponse(410, "promo_expired", "Este código ha caducado.");
    }

    if (promoCode.max_redemptions !== null && promoCode.times_redeemed >= promoCode.max_redemptions) {
      return errorResponse(409, "promo_depleted", "Este código ya ha alcanzado su límite de usos.");
    }

    const { data: previousRedemption } = await db
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promoCode.id)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string }>();

    if (previousRedemption) {
      return errorResponse(409, "promo_already_used", "Ya has usado este código en tu cuenta.");
    }

    const { error: updateProfileError } = await db
      .from("profiles")
      .update({
        plan: promoCode.plan,
        stripe_pending_plan: null,
        stripe_pending_plan_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateProfileError) {
      console.error("promo_profile_update_error", updateProfileError);
      return errorResponse(500, "promo_apply_failed", "No se pudo actualizar tu plan.");
    }

    const { error: redemptionError } = await db.from("promo_code_redemptions").insert({
      promo_code_id: promoCode.id,
      user_id: user.id,
      plan_granted: promoCode.plan,
    });

    if (redemptionError) {
      console.error("promo_redemption_insert_error", redemptionError);
    }

    const { error: incrementError } = await db
      .from("promo_codes")
      .update({ times_redeemed: promoCode.times_redeemed + 1, updated_at: new Date().toISOString() })
      .eq("id", promoCode.id);

    if (incrementError) {
      console.error("promo_increment_error", incrementError);
    }

    return NextResponse.json({
      plan: promoCode.plan,
      message: `Código aplicado. Tu cuenta ahora tiene el plan ${promoCode.plan === "empresa" ? "Empresa" : "Pro"}.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Introduce un código válido.");
    }

    console.error("promo_redeem_error", error);
    return errorResponse(500, "promo_redeem_failed", "No se pudo aplicar el código.");
  }
}

function normalizePromoCode(code: string) {
  return code.trim().replace(/\s+/g, "-").toUpperCase();
}

function hasManagedStripeSubscription(profile: Profile) {
  return Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
}