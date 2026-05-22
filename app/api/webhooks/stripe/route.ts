import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getErrorMessage, recordApiErrorEvent } from "@/lib/api-error-monitor";
import { getPlanFromStripePriceId, getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

type PaidPlan = Extract<Profile["plan"], "pro" | "empresa">;

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

      if (userId && customerId && targetPlan) {
        await db
          .from("profiles")
          .update({ plan: targetPlan, stripe_customer_id: customerId })
          .eq("id", userId);

        await db.from("workspaces").update({ plan: targetPlan }).eq("owner_id", userId);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = getPlanFromSubscription(subscription);
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      if (plan) {
        await updatePlanByUserOrCustomer({
          userId,
          customerId,
          plan,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      await updatePlanByUserOrCustomer({ userId, customerId, plan: "free" });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        await updatePlanByUserOrCustomer({ customerId, plan: "free" });
      }
    }

    return NextResponse.json({ received: true });

    async function updatePlanByUserOrCustomer({
      userId,
      customerId,
      plan,
    }: {
      userId?: string;
      customerId?: string;
      plan: Profile["plan"];
    }) {
      if (userId) {
        await db.from("profiles").update({ plan }).eq("id", userId);
        await db.from("workspaces").update({ plan }).eq("owner_id", userId);
        return;
      }

      if (customerId) {
        const { data: profile } = await db
          .from("profiles")
          .update({ plan })
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
  const metadataPlan = normalizePaidPlan(subscription.metadata?.target_plan);

  if (metadataPlan) {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;
  return getPlanFromStripePriceId(priceId);
}
