import { NextResponse } from "next/server";
import { getStripe, stripePriceIds } from "@/lib/stripe";
import { requireUser, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesión para actualizar tu plan.");
    }

    const stripe = getStripe();

    if (!stripe || !stripePriceIds.pro) {
      return errorResponse(500, "stripe_not_configured", "Configura Stripe antes de iniciar el checkout.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("checkout_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontró tu perfil.");
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
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceIds.pro, quantity: 1 }],
      success_url: `${appUrl}/dashboard?success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    if (!session.url) {
      return errorResponse(500, "checkout_url_missing", "Stripe no devolvió una URL de checkout.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_error", error);
    return errorResponse(500, "checkout_failed", "No se pudo crear la sesión de pago.");
  }
}
