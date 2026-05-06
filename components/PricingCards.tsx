"use client";

import { useState } from "react";

type PricingCardsProps = {
  compact?: boolean;
};

export function PricingCards({ compact }: PricingCardsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      price: "0 €",
      description: "Para probar DocuGen con documentos puntuales.",
      features: ["3 documentos/mes", "Historial básico", "Exportación PDF y TXT"],
      action: "Empezar gratis",
      href: "/auth",
    },
    {
      name: "Pro",
      price: "9 €/mes",
      description: "Para profesionales que generan documentación cada semana.",
      features: ["Documentos ilimitados", "Word preparado para Fase 2", "Marca personalizada preparada"],
      action: loading ? "Conectando..." : "Actualizar a Pro",
      onClick: startCheckout,
      highlighted: true,
    },
    {
      name: "Empresa",
      price: "39 €/mes",
      description: "Arquitectura preparada para equipos y workspaces.",
      features: ["Workspaces preparados", "Roles de equipo", "Price ID listo para Stripe"],
      action: "Próximamente",
      disabled: true,
    },
  ];

  return (
    <section id="precios" className={compact ? "" : "container-page py-16"}>
      {!compact && (
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">Precios</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Empieza gratis y crece cuando lo necesites</h2>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.name}
            className={`rounded-md border p-6 ${
              card.highlighted ? "border-[#2d6a4f] bg-white shadow-sm" : "border-[#d8f3dc] bg-white/70"
            }`}
          >
            <h3 className="text-xl font-bold">{card.name}</h3>
            <p className="mt-3 font-serif-display text-4xl font-bold text-[#2d6a4f]">{card.price}</p>
            <p className="mt-3 min-h-12 text-sm text-slate-600">{card.description}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {card.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            {card.onClick ? (
              <button
                type="button"
                onClick={card.onClick}
                disabled={loading || card.disabled}
                className="focus-ring mt-6 w-full rounded-md bg-[#2d6a4f] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {card.action}
              </button>
            ) : (
              <a
                href={card.href || "#"}
                className={`focus-ring mt-6 block w-full rounded-md px-4 py-3 text-center text-sm font-semibold ${
                  card.disabled ? "bg-slate-200 text-slate-500" : "bg-[#2d6a4f] text-white"
                }`}
              >
                {card.action}
              </a>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </section>
  );
}
