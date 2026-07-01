import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { getStripe } from "@/lib/stripe";
import { requireUser, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para gestionar tu suscripción.");
    }

    const stripe = getStripe();

    if (!stripe) {
      await recordApiErrorEvent({
        supabase,
        userId: user.id,
        route: "/api/create-portal",
        provider: "stripe",
        errorCode: "stripe_not_configured",
        severity: "high",
        message: "Stripe no esta configurado.",
      });
      return errorResponse(500, "stripe_not_configured", "Configura Stripe antes de abrir el portal.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile?.stripe_customer_id) {
      return errorResponse(400, "customer_not_found", "No hay cliente de Stripe asociado a tu cuenta.");
    }

    if (!hasManagedStripeSubscription(profile)) {
      return errorResponse(
        409,
        "stripe_subscription_missing",
        "Tu plan actual no tiene una suscripcion activa en Stripe. Si es un plan manual, puedes volver a Free desde DocuGen.",
      );
    }

    const portalParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
    };
    const portalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

    if (portalConfigurationId) {
      portalParams.configuration = portalConfigurationId;
    }

    const session = await stripe.billingPortal.sessions.create(portalParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("portal_error", error);
    await recordApiErrorEvent({
      route: "/api/create-portal",
      provider: "stripe",
      errorCode: "portal_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "portal_failed", "No se pudo abrir el portal de cliente.");
  }
}

function hasManagedStripeSubscription(profile: Profile) {
  return Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
}