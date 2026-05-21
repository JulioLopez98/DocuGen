import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, getStripePriceIdForPlan, type StripePaidPlan } from "@/lib/stripe";
import { requireUser, type Profile } from "@/lib/supabase-server";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "empresa"]).default("pro"),
});

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para actualizar tu plan.");
    }

    const stripe = getStripe();
    const payload = checkoutSchema.parse(await readJsonBody(request));
    const targetPlan: StripePaidPlan = payload.plan;
    const priceId = getStripePriceIdForPlan(targetPlan);

    if (!stripe || !priceId) {
      return errorResponse(
        500,
        "stripe_not_configured",
        targetPlan === "empresa"
          ? "Configura STRIPE_PRICE_ID_EMPRESA antes de iniciar el checkout Empresa."
          : "Configura Stripe antes de iniciar el checkout.",
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("checkout_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (profile.plan !== "free") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/dashboard`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?success=true&plan=${targetPlan}`,
      cancel_url: `${appUrl}/precios?canceled=true&plan=${targetPlan}`,
      metadata: { supabase_user_id: user.id, target_plan: targetPlan },
      subscription_data: {
        metadata: { supabase_user_id: user.id, target_plan: targetPlan },
      },
    });

    if (!session.url) {
      return errorResponse(500, "checkout_url_missing", "Stripe no devolvio una URL de checkout.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, "invalid_payload", "Selecciona un plan valido.");
    }

    console.error("checkout_error", error);
    return errorResponse(500, "checkout_failed", "No se pudo crear la sesion de pago.");
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
