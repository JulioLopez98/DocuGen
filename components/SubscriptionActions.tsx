"use client";

import { useState } from "react";

type SubscriptionActionsProps = {
  plan: "free" | "pro" | "empresa";
  hasCustomer: boolean;
};

export function SubscriptionActions({ plan, hasCustomer }: SubscriptionActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const isPaid = plan !== "free";

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
        setError(payload.message || "No se pudo crear la sesión.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("No se pudo conectar con Stripe. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setLoading(null);
    }
  }

  return (
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
      {plan !== "empresa" && (
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
      {isPaid && hasCustomer && (
        <button
          type="button"
          onClick={() => go("/api/create-portal")}
          disabled={loading !== null}
          className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading === "/api/create-portal" ? "Abriendo..." : "Gestionar suscripción"}
        </button>
      )}
      {isPaid && !hasCustomer && (
        <p className="status-note">
          Plan activo. El portal de Stripe aparecerá cuando exista un cliente de facturación asociado.
        </p>
      )}
      {error && <p className="status-error w-full">{error}</p>}
    </div>
  );
}
