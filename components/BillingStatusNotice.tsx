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
  const isCanceling = Boolean(profile.stripe_cancel_at_period_end && profile.stripe_current_period_end);
  const periodEndLabel = profile.stripe_current_period_end ? formatDate(profile.stripe_current_period_end) : null;

  if (!isPaid) {
    return (
      <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4 text-sm">
        <p className="font-bold text-[#2d6a4f]">Plan Free activo</p>
        <p className="mt-2 text-slate-600">
          Puedes usar tus documentos gratuitos del mes. Si actualizas, la suscripción se gestionará desde el portal
          seguro de Stripe.
        </p>
      </div>
    );
  }

  if (!hasManagedSubscription) {
    return (
      <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4 text-sm">
        <p className="font-bold text-[#2d6a4f]">Plan {getPlanLabel(profile.plan)} activo</p>
        <p className="mt-2 text-slate-600">
          Este acceso está activado manualmente para pruebas o desarrollo. No hay una suscripción activa en Stripe que
          cancelar desde el portal.
        </p>
      </div>
    );
  }

  if (isCanceling) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Suscripción cancelada</p>
        <p className="mt-2">
          Tu plan {getPlanLabel(profile.plan)} seguirá activo hasta el {periodEndLabel}. Ese día DocuGen pasará
          automáticamente a Free si no hay otra suscripción activa.
        </p>
        {variant === "full" && (
          <p className="mt-2 text-amber-800">
            No se devuelve el importe del mes ya pagado. Hasta esa fecha puedes seguir usando las funciones de tu plan y
            reactivar la suscripción si cambias de idea.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#f4fbf5] p-4 text-sm">
      <p className="font-bold text-[#2d6a4f]">Suscripción activa</p>
      <p className="mt-2 text-slate-700">
        Tu plan {getPlanLabel(profile.plan)} está activo
        {periodEndLabel ? ` hasta el próximo periodo de facturación: ${periodEndLabel}.` : "."}
      </p>
      {variant === "full" && (
        <p className="mt-2 text-slate-600">
          Puedes cambiar de plan o cancelar cuando quieras. Si cancelas, mantendrás el acceso hasta que termine el mes ya
          pagado y después DocuGen volverá a Free automáticamente.
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
