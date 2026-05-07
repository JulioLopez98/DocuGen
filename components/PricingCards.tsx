"use client";

import Link from "next/link";
import { useState } from "react";

type PricingCardsProps = {
  compact?: boolean;
  currentPlan?: "free" | "pro" | "empresa" | null;
};

export function PricingCards({ compact, currentPlan }: PricingCardsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = currentPlan === "pro" || currentPlan === "empresa";

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/create-checkout", { method: "POST" });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (!response.ok || !payload.url) {
        setError(payload.message || "No se pudo iniciar el pago.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("No se pudo conectar con Stripe.");
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      name: "Free",
      price: "0 EUR",
      description: "Para probar DocuGen con documentos puntuales.",
      features: ["3 documentos al mes", "Tipos esenciales incluidos", "Exportacion PDF y TXT"],
      action: currentPlan ? "Plan inicial" : "Empezar gratis",
      href: currentPlan ? "/dashboard" : "/auth",
      disabled: currentPlan === "free",
    },
    {
      name: "Pro",
      price: "9 EUR/mes",
      description: "Para profesionales que generan documentacion cada semana.",
      features: ["Documentos ilimitados", "Tipos laborales y legales avanzados", "Word y marca personalizada"],
      action: isPro ? "Plan actual" : loading ? "Conectando..." : "Actualizar a Pro",
      onClick: isPro ? undefined : startCheckout,
      href: isPro ? "/dashboard" : undefined,
      highlighted: true,
      disabled: isPro,
    },
    {
      name: "Empresa",
      price: "39 EUR/mes",
      description: "Arquitectura preparada para equipos y workspaces.",
      features: ["Workspaces preparados", "Roles de equipo", "Facturacion avanzada preparada"],
      action: "Proximamente",
      disabled: true,
    },
  ];

  return (
    <section id="precios" className={compact ? "" : "container-page py-16 scroll-mt-24"}>
      {!compact && (
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Precios</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Empieza gratis y crece cuando lo necesites</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Free sirve para probar el flujo completo. Pro desbloquea uso intensivo, Word y marca personalizada.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className={`interactive rounded-md p-6 ${card.highlighted ? "surface" : "surface-flat"}`}>
            <h3 className="text-xl font-bold">{card.name}</h3>
            <p className="mt-3 font-serif-display text-4xl font-bold text-[#2d6a4f]">{card.price}</p>
            <p className="mt-3 min-h-12 text-sm text-slate-600">{card.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {card.features.map((feature) => (
                <li key={feature}>Incluye: {feature}</li>
              ))}
            </ul>
            {card.onClick ? (
              <button
                type="button"
                onClick={card.onClick}
                disabled={loading || card.disabled}
                className="focus-ring btn-primary mt-6 w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {card.action}
              </button>
            ) : card.href ? (
              <Link
                href={card.href}
                className={`focus-ring mt-6 w-full px-4 py-3 text-sm ${card.disabled ? "btn-secondary" : "btn-primary"}`}
              >
                {card.action}
              </Link>
            ) : (
              <span className="mt-6 block w-full rounded-md bg-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                {card.action}
              </span>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
  );
}
