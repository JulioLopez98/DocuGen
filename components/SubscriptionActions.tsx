"use client";

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

  async function go(endpoint: "/api/create-checkout" | "/api/create-portal", targetPlan?: "pro" | "empresa") {
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

      if (!response.ok || !payload.url) {
        setError(payload.message || "No se pudo crear la sesion.");
        return;
      }

      window.location.href = payload.url;
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
          "Cancelar la suscripcion al final del periodo? Mantendras el acceso hasta la fecha ya pagada y no se renovara despues.",
        )
      : window.confirm("Reactivar la suscripcion? Se volvera a renovar en el proximo periodo de facturacion.");

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
        setError(payload.message || "No se pudo actualizar la suscripcion.");
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
        {plan !== "empresa" && !cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => go("/api/create-checkout", "empresa")}
            disabled={loading !== null}
            className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/create-checkout:empresa"
              ? "Conectando..."
              : isPaid
                ? "Cambiar a Empresa"
                : "Actualizar a Empresa"}
          </button>
        )}
        {isPaid && hasCustomer && hasManagedSubscription && (
          <button
            type="button"
            onClick={() => go("/api/create-portal")}
            disabled={loading !== null}
            className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/create-portal" ? "Abriendo..." : "Cambiar plan o tarjeta"}
          </button>
        )}
        {isPaid && hasManagedSubscription && !cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => updateStripeCancellation("cancel_at_period_end")}
            disabled={loading !== null}
            className="focus-ring rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {loading === "/api/subscription/cancel:cancel_at_period_end" ? "Programando..." : "Cancelar al final del periodo"}
          </button>
        )}
        {isPaid && hasManagedSubscription && cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => updateStripeCancellation("reactivate")}
            disabled={loading !== null}
            className="focus-ring btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {loading === "/api/subscription/cancel:reactivate" ? "Reactivando..." : "Reactivar suscripcion"}
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
          Los pagos reales se gestionan con Stripe. Si cancelas, DocuGen mantendra tu acceso hasta el final del periodo
          ya pagado{periodEndLabel ? ` (${periodEndLabel})` : ""} y despues volvera a Free automaticamente.
        </p>
      )}
      {isPaid && hasManagedSubscription && cancelAtPeriodEnd && (
        <p className="status-warning">
          Renovacion cancelada. Mantienes el acceso hasta {periodEndLabel || "el final del periodo pagado"}. Puedes
          reactivar antes de esa fecha.
        </p>
      )}
      {isPaid && hasCustomer && !hasManagedSubscription && (
        <p className="status-note">
          Plan activo manualmente para pruebas. No hay una suscripcion activa en Stripe que gestionar o cancelar.
        </p>
      )}
      {isPaid && !hasCustomer && (
        <p className="status-note">
          Plan activo manualmente. No hay cliente ni suscripcion de Stripe asociados, asi que volver a Free no cancela
          ningun pago.
        </p>
      )}
      {error && <p className="status-error w-full">{error}</p>}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}