import { NextResponse } from "next/server";
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

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("portal_error", error);
    return errorResponse(500, "portal_failed", "No se pudo abrir el portal de cliente.");
  }
}
