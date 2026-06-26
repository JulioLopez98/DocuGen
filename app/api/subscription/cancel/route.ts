import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { getStripe } from "@/lib/stripe";
import { requireUser, type Profile } from "@/lib/supabase-server";

const subscriptionActionSchema = z.object({
  action: z.enum(["cancel_at_period_end", "reactivate"]),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type SubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number | null;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para gestionar tu suscripcion.");
    }

    const stripe = getStripe();

    if (!stripe) {
      return errorResponse(500, "stripe_not_configured", "Stripe no esta configurado.");
    }

    const payload = subscriptionActionSchema.parse(await request.json());
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("subscription_action_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (!profile.stripe_subscription_id) {
      return errorResponse(
        409,
        "stripe_subscription_missing",
        "Este plan no tiene una suscripcion activa en Stripe. Si es un plan manual, puedes volver a Free desde DocuGen.",
      );
    }

    const cancelAtPeriodEnd = payload.action === "cancel_at_period_end";
    const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
    const periodEnd = getCurrentPeriodEnd(subscription);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_subscription_status: subscription.status,
        stripe_current_period_end: periodEnd,
        stripe_cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("subscription_action_profile_update_error", updateError);
    }

    return NextResponse.json({
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: periodEnd,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Accion de suscripcion no valida.");
    }

    console.error("subscription_action_error", error);
    await recordApiErrorEvent({
      route: "/api/subscription/cancel",
      provider: "stripe",
      errorCode: "subscription_action_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "subscription_action_failed", "No se pudo actualizar la suscripcion.");
  }
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const periodSubscription = subscription as SubscriptionWithPeriodEnd;

  return periodSubscription.current_period_end
    ? new Date(periodSubscription.current_period_end * 1000).toISOString()
    : null;
}
