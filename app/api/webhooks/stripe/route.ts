import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { getPlanFromStripePriceId, getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type PaidPlan = Extract<Profile["plan"], "pro" | "empresa">;
type BillingState = {
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_current_period_end: string | null;
  stripe_cancel_at_period_end: boolean;
};
type SubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number | null;
};

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = createSupabaseServiceClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !supabase || !webhookSecret) {
      await recordApiErrorEvent({
        supabase,
        route: "/api/webhooks/stripe",
        provider: "stripe",
        errorCode: "webhook_not_configured",
        severity: "high",
        message: "Webhook de Stripe no configurado.",
      });
      return errorResponse(500, "webhook_not_configured", "Webhook de Stripe no configurado.");
    }

    const db = supabase;

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return errorResponse(400, "signature_missing", "Falta la firma de Stripe.");
    }

    const body = await request.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("stripe_signature_error", error);
      await recordApiErrorEvent({
        supabase,
        route: "/api/webhooks/stripe",
        provider: "stripe",
        errorCode: "invalid_signature",
        severity: "medium",
        message: getErrorMessage(error),
      });
      return errorResponse(400, "invalid_signature", "Firma de Stripe no valida.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const targetPlan = normalizePaidPlan(session.metadata?.target_plan);
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (userId && customerId && targetPlan) {
        await db
          .from("profiles")
          .update({
            plan: targetPlan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
            stripe_subscription_status: "active",
          })
          .eq("id", userId);

        await db.from("workspaces").update({ plan: targetPlan }).eq("owner_id", userId);

        if (subscriptionId) {
          await cancelDuplicateSubscriptions(stripe, customerId, subscriptionId);
        }
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = getPlanFromSubscription(subscription);
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const billingState = getBillingStateFromSubscription(subscription);

      if (plan) {
        await updatePlanByUserOrCustomer({
          userId,
          customerId,
          plan,
          billingState,
        });

        if (customerId && isActiveSubscription(subscription) && !subscription.cancel_at_period_end) {
          await cancelDuplicateSubscriptions(stripe, customerId, subscription.id);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const fallbackSubscription = customerId ? await getBestActiveSubscriptionForCustomer(stripe, customerId) : null;

      await updatePlanByUserOrCustomer({
        userId,
        customerId,
        plan: fallbackSubscription?.plan ?? "free",
        billingState: fallbackSubscription?.billingState ?? getClearedBillingState(),
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        const fallbackSubscription = await getBestActiveSubscriptionForCustomer(stripe, customerId);
        await updatePlanByUserOrCustomer({
          customerId,
          plan: fallbackSubscription?.plan ?? "free",
          billingState: fallbackSubscription?.billingState ?? getClearedBillingState(),
        });
      }
    }

    return NextResponse.json({ received: true });

    async function updatePlanByUserOrCustomer({
      userId,
      customerId,
      plan,
      billingState,
    }: {
      userId?: string;
      customerId?: string;
      plan: Profile["plan"];
      billingState?: BillingState;
    }) {
      const updatePayload = {
        plan,
        ...(billingState ?? {}),
      };

      if (userId) {
        await db.from("profiles").update(updatePayload).eq("id", userId);
        await db.from("workspaces").update({ plan }).eq("owner_id", userId);
        return;
      }

      if (customerId) {
        const { data: profile } = await db
          .from("profiles")
          .update(updatePayload)
          .eq("stripe_customer_id", customerId)
          .select("id")
          .maybeSingle<Pick<Profile, "id">>();

        if (profile?.id) {
          await db.from("workspaces").update({ plan }).eq("owner_id", profile.id);
        }
      }
    }
  } catch (error) {
    console.error("stripe_webhook_error", error);
    await recordApiErrorEvent({
      route: "/api/webhooks/stripe",
      provider: "stripe",
      errorCode: "webhook_failed",
      severity: "high",
      message: getErrorMessage(error),
    });
    return errorResponse(500, "webhook_failed", "No se pudo procesar el webhook.");
  }
}

function normalizePaidPlan(plan?: string): PaidPlan | null {
  return plan === "pro" || plan === "empresa" ? plan : null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): PaidPlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  const pricePlan = getPlanFromStripePriceId(priceId);

  if (pricePlan) {
    return pricePlan;
  }

  return normalizePaidPlan(subscription.metadata?.target_plan);
}

function isActiveSubscription(subscription: Stripe.Subscription) {
  return ["active", "trialing", "past_due"].includes(subscription.status);
}

function getBillingStateFromSubscription(subscription: Stripe.Subscription): BillingState {
  const periodSubscription = subscription as SubscriptionWithPeriodEnd;
  const currentPeriodEnd = periodSubscription.current_period_end
    ? new Date(periodSubscription.current_period_end * 1000).toISOString()
    : null;

  return {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: currentPeriodEnd,
    stripe_cancel_at_period_end: subscription.cancel_at_period_end,
  };
}

function getClearedBillingState(): BillingState {
  return {
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    stripe_current_period_end: null,
    stripe_cancel_at_period_end: false,
  };
}

async function cancelDuplicateSubscriptions(stripe: Stripe, customerId: string, keepSubscriptionId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  const duplicates = subscriptions.data.filter(
    (subscription) =>
      subscription.id !== keepSubscriptionId &&
      isActiveSubscription(subscription) &&
      !subscription.cancel_at_period_end,
  );

  for (const subscription of duplicates) {
    try {
      await stripe.subscriptions.cancel(subscription.id);
    } catch (error) {
      console.error("stripe_duplicate_subscription_cancel_error", {
        subscriptionId: subscription.id,
        message: getErrorMessage(error),
      });
    }
  }
}

async function getBestActiveSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<{ plan: PaidPlan; billingState: BillingState } | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  const activeSubscriptions = subscriptions.data
    .filter((subscription) => isActiveSubscription(subscription))
    .map((subscription) => {
      const plan = getPlanFromSubscription(subscription);

      return plan ? { plan, billingState: getBillingStateFromSubscription(subscription) } : null;
    })
    .filter((subscription): subscription is { plan: PaidPlan; billingState: BillingState } => Boolean(subscription));

  const empresaSubscription = activeSubscriptions.find((subscription) => subscription.plan === "empresa");

  if (empresaSubscription) {
    return empresaSubscription;
  }

  return activeSubscriptions.find((subscription) => subscription.plan === "pro") ?? null;
}
