import { NextResponse } from "next/server";
import { requireUser, type Profile } from "@/lib/supabase-server";

const errorResponse = (status: number, error: string, message: string) =>
  NextResponse.json({ error, message }, { status });

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    if (!supabase || !user) {
      return errorResponse(401, "unauthorized", "Inicia sesion para cambiar tu plan.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("downgrade_profile_error", profileError);
      return errorResponse(404, "profile_not_found", "No se encontro tu perfil.");
    }

    if (profile.plan === "free") {
      return NextResponse.json({ plan: "free" });
    }

    if (hasManagedStripeSubscription(profile)) {
      return errorResponse(
        409,
        "stripe_subscription_required",
        "Tu plan se gestiona desde Stripe. Abre el portal de suscripcion para cancelar o cambiar de plan.",
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "free",
        stripe_subscription_id: null,
        stripe_subscription_status: null,
        stripe_current_period_end: null,
        stripe_cancel_at_period_end: false,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("downgrade_profile_update_error", updateError);
      return errorResponse(500, "downgrade_failed", "No se pudo volver al plan Free.");
    }

    const { error: workspaceError } = await supabase
      .from("workspaces")
      .update({ plan: "free" })
      .eq("owner_id", user.id);

    if (workspaceError) {
      console.error("downgrade_workspace_update_error", workspaceError);
    }

    return NextResponse.json({ plan: "free" });
  } catch (error) {
    console.error("downgrade_unhandled", error);
    return errorResponse(500, "downgrade_failed", "No se pudo volver al plan Free.");
  }
}

function hasManagedStripeSubscription(profile: Profile) {
  return Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
}
