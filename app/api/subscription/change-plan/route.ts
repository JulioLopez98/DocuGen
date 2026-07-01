import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { getStripe, getStripePriceIdForPlan, type StripePaidPlan } from "@/lib/stripe";
import { requireUser, type Profile } from "@/lib/supabase-server";

const changePlanSchema = z.object({
  plan: z.enum(["pro", "empresa"]),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type SubscriptionWithPeriods = Stripe.Subscription & {
  current_period_start?: number | null;
  current_period_end?: number | null;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para cambiar de plan.");
    }

    const stripe = getStripe();

    if (!stripe) {
      return errorResponse(500, "stripe_not_configured", "Stripe no esta configurado.");
    }

    const payload = changePlanSchema.parse(await request.json());
    const targetPlan: StripePaidPlan = payload.plan;
    const targetPriceId = getStripePriceIdForPlan(targetPlan);

    if (!targetPriceId) {
      return errorResponse(500, "stripe_price_missing", `Configura el price id de ${targetPlan} en Vercel.`);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("change_plan_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (!profile.stripe_subscription_id) {
      return errorResponse(409, "stripe_subscription_missing", "Este usuario no tiene una suscripcion activa gestionada por Stripe.");
    }

    if (profile.plan === targetPlan) {
      return NextResponse.json({ message: "Ya estas en ese plan." });
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      return errorResponse(409, "subscription_item_missing", "No se encontro el plan actual en Stripe.");
    }

    if (profile.plan === "pro" && targetPlan === "empresa") {
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
        items: [{ id: subscriptionItem.id, price: targetPriceId }],
        metadata: { ...subscription.metadata, supabase_user_id: user.id, target_plan: targetPlan },
        proration_behavior: "always_invoice",
      });

      const periodEnd = getCurrentPeriodEnd(updatedSubscription);
      await supabase
        .from("profiles")
        .update({
          plan: "empresa",
          stripe_subscription_status: updatedSubscription.status,
          stripe_current_period_end: periodEnd,
          stripe_cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        })
        .eq("id", user.id);
      await supabase.from("workspaces").update({ plan: "empresa" }).eq("owner_id", user.id);

      return NextResponse.json({
        message: "Plan actualizado a Empresa. Stripe aplicara el prorrateo automaticamente.",
        url: "/dashboard?plan_changed=empresa",
      });
    }

    if (profile.plan === "empresa" && targetPlan === "pro") {
      const periodEnd = getPeriodTimestamp(subscription, "end");
      const periodStart = getPeriodTimestamp(subscription, "start");

      if (!periodStart || !periodEnd) {
        return errorResponse(409, "billing_period_missing", "Stripe no devolvio las fechas del periodo actual.");
      }

      const scheduleId = await getOrCreateScheduleId(stripe, subscription);
      await stripe.subscriptionSchedules.update(scheduleId, {
        end_behavior: "release",
        metadata: { supabase_user_id: user.id, target_plan: "pro", change_type: "scheduled_downgrade" },
        phases: [
          {
            items: [{ price: subscriptionItem.price.id, quantity: subscriptionItem.quantity || 1 }],
            start_date: periodStart,
            end_date: periodEnd,
            metadata: { supabase_user_id: user.id, target_plan: "empresa" },
          },
          {
            items: [{ price: targetPriceId, quantity: subscriptionItem.quantity || 1 }],
            start_date: periodEnd,
            metadata: { supabase_user_id: user.id, target_plan: "pro" },
          },
        ],
      });

      await supabase
        .from("profiles")
        .update({
          stripe_current_period_end: new Date(periodEnd * 1000).toISOString(),
          stripe_cancel_at_period_end: false,
        })
        .eq("id", user.id);

      return NextResponse.json({
        message: `Mantienes Empresa hasta ${new Date(periodEnd * 1000).toLocaleDateString("es-ES")}. Despues pasaras a Pro automaticamente.`,
        url: "/dashboard?plan_scheduled=pro",
      });
    }

    return errorResponse(400, "unsupported_plan_change", "Ese cambio de plan no esta disponible.");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona un plan valido.");
    }

    console.error("change_plan_error", error);
    await recordApiErrorEvent({
      route: "/api/subscription/change-plan",
      provider: "stripe",
      errorCode: "change_plan_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "change_plan_failed", "No se pudo cambiar el plan.");
  }
}

async function getOrCreateScheduleId(stripe: Stripe, subscription: Stripe.Subscription) {
  const existingSchedule = subscription.schedule;

  if (typeof existingSchedule === "string") {
    return existingSchedule;
  }

  if (existingSchedule?.id) {
    return existingSchedule.id;
  }

  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id });
  return schedule.id;
}

function getPeriodTimestamp(subscription: Stripe.Subscription, side: "start" | "end") {
  const periodSubscription = subscription as SubscriptionWithPeriods;
  return side === "start" ? periodSubscription.current_period_start || null : periodSubscription.current_period_end || null;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnd = getPeriodTimestamp(subscription, "end");
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

