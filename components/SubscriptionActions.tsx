"use client";

import Link from "next/link";
import { useState } from "react";

type SubscriptionActionsProps = {
  plan: "free" | "pro" | "empresa";
  hasCustomer: boolean;
  hasManagedSubscription?: boolean;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
};

export function SubscriptionActions({
  plan,
  hasCustomer,
  hasManagedSubscription = false,
  cancelAtPeriodEnd = false,
  currentPeriodEnd,
}: SubscriptionActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const isPaid = plan !== "free";
  const periodEndLabel = currentPeriodEnd ? formatDate(currentPeriodEnd) : null;

  async function go(endpoint: "/api/create-checkout" | "/api/create-portal" | "/api/subscription/change-plan", targetPlan?: "pro" | "empresa") {
    const loadingKey = targetPlan ? `${endpoint}:${targetPlan}` : endpoint;
    setLoading(loadingKey);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: targetPlan ? { "Content-Type": "application/json" } : undefined,
        body: targetPlan ? JSON.stringify({ plan: targetPlan }) : undefined,
      });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo gestionar el plan.");
        return;
      }

      if (payload.message && !payload.url) {
        window.alert(payload.message);
      }

      window.location.href = payload.url || "/dashboard";
    } catch {
      setError("No se pudo conectar con Stripe. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setLoading(null);
    }
  }

  async function updateStripeCancellation(action: "cancel_at_period_end" | "reactivate") {
    const canceling = action === "cancel_at_period_end";
    const confirmed = canceling
      ? window.confirm(
          `Vas a cancelar tu suscripción. Mantendrás el acceso a ${getPlanLabel(plan)} hasta ${periodEndLabel || "el final del periodo ya pagado"}. Después DocuGen pasará a Free automáticamente. No se devuelve el importe del mes ya pagado. ¿Quieres continuar?`,
        )
      : window.confirm("¿Quieres reactivar la suscripción? El plan volverá a renovarse en el próximo periodo de facturación.");

    if (!confirmed) {
      return;
    }

    setLoading(`/api/subscription/cancel:${action}`);
    setError(null);

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo actualizar la suscripción.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("No se pudo conectar con Stripe. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setLoading(null);
    }
  }

  async function downgradeFree() {
    if (!window.confirm("Volver al plan Free? Este cambio es solo para planes manuales de prueba y no cancela Stripe.")) {
      return;
    }

    setLoading("/api/downgrade-free");
    setError(null);

    try {
      const response = await fetch("/api/downgrade-free", { method: "POST" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo volver al plan Free.");
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("No se pudo conectar con DocuGen. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        {!isPaid && (
          <button
            type="button"
            onClick={() => go("/api/create-checkout", "pro")}
            disabled={loading !== null}
            className="focus-ring btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/create-checkout:pro" ? "Conectando..." : "Actualizar a Pro"}
          </button>
        )}
        {!isPaid && (
          <button
            type="button"
            onClick={() => go("/api/create-checkout", "empresa")}
            disabled={loading !== null}
            className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/create-checkout:empresa" ? "Conectando..." : "Actualizar a Empresa"}
          </button>
        )}
        {isPaid && hasManagedSubscription && !cancelAtPeriodEnd && (
          <Link href="/precios" className="focus-ring btn-primary px-4 py-2 text-sm">
            Cambiar plan
          </Link>
        )}
        {isPaid && hasCustomer && hasManagedSubscription && !cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => go("/api/create-portal")}
            disabled={loading !== null}
            className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/create-portal" ? "Abriendo..." : "Tarjeta y facturas"}
          </button>
        )}
        {isPaid && hasManagedSubscription && !cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => updateStripeCancellation("cancel_at_period_end")}
            disabled={loading !== null}
            className="focus-ring rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
          >
            {loading === "/api/subscription/cancel:cancel_at_period_end" ? "Cancelando..." : "Cancelar suscripción"}
          </button>
        )}
        {isPaid && hasManagedSubscription && cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => updateStripeCancellation("reactivate")}
            disabled={loading !== null}
            className="focus-ring btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/subscription/cancel:reactivate" ? "Reactivando..." : "Reactivar suscripción"}
          </button>
        )}
        {isPaid && !hasManagedSubscription && (
          <button
            type="button"
            onClick={downgradeFree}
            disabled={loading !== null}
            className="focus-ring rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {loading === "/api/downgrade-free" ? "Cambiando..." : "Volver a Free"}
          </button>
        )}
      </div>
      {isPaid && hasManagedSubscription && !cancelAtPeriodEnd && (
        <p className="text-xs leading-5 text-slate-500">
          Puedes cambiar de plan desde Precios y gestionar tarjeta o facturas desde Stripe. Si cancelas, mantendras {getPlanLabel(plan)} hasta
          {periodEndLabel ? ` el ${periodEndLabel}` : " que termine el periodo ya pagado"}; despues DocuGen pasara a Free
          automaticamente. No se devuelve el importe del mes ya pagado.
        </p>
      )}
      {isPaid && hasManagedSubscription && cancelAtPeriodEnd && (
        <p className="status-warning">
          Suscripción cancelada. Mantienes {getPlanLabel(plan)} hasta {periodEndLabel || "el final del periodo ya pagado"}.
          Después DocuGen pasará a Free automáticamente. Puedes reactivarla antes de esa fecha.
        </p>
      )}
      {isPaid && hasCustomer && !hasManagedSubscription && (
        <p className="status-note">
          Plan activo manualmente para pruebas. No hay una suscripción activa en Stripe que gestionar o cancelar.
        </p>
      )}
      {isPaid && !hasCustomer && (
        <p className="status-note">
          Plan activo manualmente. No hay cliente ni suscripción de Stripe asociados, así que volver a Free no cancela
          ningún pago.
        </p>
      )}
      {error && <p className="status-error w-full">{error}</p>}
    </div>
  );
}

function getPlanLabel(plan: "free" | "pro" | "empresa") {
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

