import type { Profile } from "@/lib/supabase-server";

type BillingStatusNoticeProps = {
  profile: Profile;
  variant?: "compact" | "full";
};

export function BillingStatusNotice({ profile, variant = "full" }: BillingStatusNoticeProps) {
  const isPaid = profile.plan !== "free";
  const isCanceling = Boolean(profile.stripe_cancel_at_period_end && profile.stripe_current_period_end);
  const periodEndLabel = profile.stripe_current_period_end ? formatDate(profile.stripe_current_period_end) : null;

  if (!isPaid) {
    return (
      <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4 text-sm">
        <p className="font-bold text-[#2d6a4f]">Plan Free activo</p>
        <p className="mt-2 text-slate-600">
          Puedes usar tus documentos gratuitos del mes. Si actualizas, la suscripcion se gestionara desde el portal
          seguro de Stripe.
        </p>
      </div>
    );
  }

  if (isCanceling) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Cancelacion programada</p>
        <p className="mt-2">
          Tu plan {getPlanLabel(profile.plan)} seguira activo hasta el {periodEndLabel}. Ese dia DocuGen pasara
          automaticamente a Free si no hay otra suscripcion activa.
        </p>
        {variant === "full" && (
          <p className="mt-2 text-amber-800">
            Mientras tanto puedes seguir usando las funciones incluidas en tu plan. Si cambias de idea, puedes reactivar
            la suscripcion desde Stripe.
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
        {periodEndLabel ? ` hasta el proximo periodo de facturacion: ${periodEndLabel}.` : "."}
      </p>
      {variant === "full" && (
        <p className="mt-2 text-slate-600">
          Si cancelas desde Stripe, el acceso no se corta de golpe: normalmente se mantiene hasta que termine el periodo
          ya pagado y despues DocuGen vuelve a Free.
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
