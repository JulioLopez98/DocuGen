"use client";

import { useState } from "react";

type PromoCodeRedeemerProps = {
  currentPlan: "free" | "pro" | "empresa";
  hasManagedSubscription: boolean;
};

type RedeemResponse = {
  plan?: "free" | "pro" | "empresa";
  message?: string;
};

export function PromoCodeRedeemer({ currentPlan, hasManagedSubscription }: PromoCodeRedeemerProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeemCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Introduce un código para continuar.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/promo-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
      });
      const payload = (await response.json()) as RedeemResponse;

      if (!response.ok) {
        setError(payload.message || "No se pudo aplicar el código.");
        return;
      }

      setCode("");
      setMessage(payload.message || "Código aplicado correctamente. Actualiza la página si no ves el nuevo plan.");
      window.setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError("No se pudo aplicar el código. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Código de acceso</p>
          <h2 className="panel-title mt-3">Activar Pro o Empresa gratis</h2>
          <p className="body-muted mt-3 max-w-2xl">
            Si DocuGen te ha dado un código privado, introdúcelo aquí para activar el plan asociado sin pasar por Stripe.
          </p>
        </div>
        <span className="badge badge-free">{currentPlan}</span>
      </div>

      {hasManagedSubscription ? (
        <p className="status-note mt-5">
          Tu cuenta tiene una suscripción activa en Stripe. Para evitar cobros duplicados o cambios confusos, los códigos manuales solo se pueden usar en cuentas sin suscripción gestionada por Stripe.
        </p>
      ) : (
        <form onSubmit={redeemCode} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="sr-only">Código promocional</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="field-control"
              placeholder="DOCUGEN-PRO-2026"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={loading} className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60">
            {loading ? "Aplicando..." : "Aplicar código"}
          </button>
        </form>
      )}

      {message && <p className="status-success mt-4">{message}</p>}
      {error && <p className="status-error mt-4">{error}</p>}
    </section>
  );
}