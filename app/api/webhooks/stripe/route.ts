import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const supabase = createSupabaseServiceClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !supabase || !webhookSecret) {
      return errorResponse(500, "webhook_not_configured", "Webhook de Stripe no configurado.");
    }

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
      return errorResponse(400, "invalid_signature", "Firma de Stripe no válida.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && customerId) {
        await supabase
          .from("profiles")
          .update({ plan: "pro", stripe_customer_id: customerId })
          .eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

      await supabase.from("profiles").update({ plan: "free" }).or(`id.eq.${userId || ""},stripe_customer_id.eq.${customerId}`);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

      if (customerId) {
        await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", customerId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_error", error);
    return errorResponse(500, "webhook_failed", "No se pudo procesar el webhook.");
  }
}
