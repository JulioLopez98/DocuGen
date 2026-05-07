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

  async function go(endpoint: "/api/create-checkout" | "/api/create-portal") {
    setLoading(endpoint);
    setError(null);

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (!response.ok || !payload.url) {
        setError(payload.message || "No se pudo crear la sesion.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("No se pudo conectar con Stripe.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {!isPaid && (
        <button
          type="button"
          onClick={() => go("/api/create-checkout")}
          disabled={loading !== null}
          className="focus-ring btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading === "/api/create-checkout" ? "Conectando..." : "Actualizar a Pro"}
        </button>
      )}
      {isPaid && hasCustomer && (
        <button
          type="button"
          onClick={() => go("/api/create-portal")}
          disabled={loading !== null}
          className="focus-ring btn-secondary px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading === "/api/create-portal" ? "Abriendo..." : "Gestionar suscripcion"}
        </button>
      )}
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}
