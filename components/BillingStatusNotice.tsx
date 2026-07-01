import type { Profile } from "@/lib/supabase-server";

type BillingStatusNoticeProps = {
  profile: Profile;
  variant?: "compact" | "full";
};

export function BillingStatusNotice({ profile, variant = "full" }: BillingStatusNoticeProps) {
  const isPaid = profile.plan !== "free";
  const hasManagedSubscription = Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
  const pendingPlan = profile.stripe_pending_plan;
  const pendingPlanAtLabel = profile.stripe_pending_plan_at ? formatDate(profile.stripe_pending_plan_at) : null;
  const periodEndLabel = profile.stripe_current_period_end ? formatDate(profile.stripe_current_period_end) : null;
  const isCanceling = Boolean(profile.stripe_cancel_at_period_end || pendingPlan === "free");

  if (!isPaid) {
    return (
      <div className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/72 p-4 text-sm">
        <p className="font-bold text-[#2d6a4f]">Plan Free activo</p>
        <p className="mt-2 text-slate-600">
          Puedes usar tus documentos gratuitos del mes. Si actualizas, el pago se gestiona de forma segura con Stripe.
        </p>
      </div>
    );
  }

  if (!hasManagedSubscription) {
    return (
      <div className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/72 p-4 text-sm">
        <p className="font-bold text-[#2d6a4f]">Plan {getPlanLabel(profile.plan)} activo</p>
        <p className="mt-2 text-slate-600">
          Este acceso esta activado manualmente para pruebas o desarrollo. No hay una suscripcion activa en Stripe que cancelar.
        </p>
      </div>
    );
  }

  if (pendingPlan && pendingPlan !== "free" && pendingPlan !== profile.plan) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Cambio de plan programado</p>
        <p className="mt-2">
          Ahora tienes {getPlanLabel(profile.plan)}. El cambio a {getPlanLabel(pendingPlan)} se aplicara el {pendingPlanAtLabel || periodEndLabel || "final del periodo ya pagado"}.
        </p>
        {variant === "full" && (
          <p className="mt-2 text-amber-800">
            Hasta esa fecha mantienes las funciones de {getPlanLabel(profile.plan)}. No se devuelve el importe del periodo ya pagado.
          </p>
        )}
      </div>
    );
  }

  if (isCanceling) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Paso a Free programado</p>
        <p className="mt-2">
          Tu plan {getPlanLabel(profile.plan)} seguira activo hasta el {pendingPlanAtLabel || periodEndLabel || "final del periodo ya pagado"}. Despues DocuGen pasara a Free automaticamente.
        </p>
        {variant === "full" && (
          <p className="mt-2 text-amber-800">
            No se devuelve el importe del periodo ya pagado. Hasta esa fecha puedes seguir usando las funciones de tu plan y reactivar la suscripcion si cambias de idea.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#f4fbf5] p-4 text-sm">
      <p className="font-bold text-[#2d6a4f]">Suscripcion activa</p>
      <p className="mt-2 text-slate-700">
        Tu plan {getPlanLabel(profile.plan)} esta activo
        {periodEndLabel ? " hasta el proximo periodo de facturacion: " + periodEndLabel + "." : "."}
      </p>
      {variant === "full" && (
        <p className="mt-2 text-slate-600">
          Cambia de plan desde Precios. Para pasar a Free, cancela la suscripcion y mantendras el acceso hasta que termine el periodo ya pagado.
        </p>
      )}
    </div>
  );
}

function getPlanLabel(plan: Profile["plan"]) {
  if (plan === "empresa") {
    return "Empresa";
  }

  if (plan === "pro") {
    return "Pro";
  }

  return "Free";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
