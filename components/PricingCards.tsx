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
      cadence: "para empezar",
      description: "Ideal para validar DocuGen, crear borradores puntuales y probar el flujo sin tarjeta.",
      features: [
        "3 documentos gratis al mes",
        "Plantillas esenciales incluidas",
        "Historial basico",
        "Exportacion PDF y TXT",
        "Avisos de revision profesional incluidos",
      ],
      action: currentPlan ? "Plan inicial" : "Empezar gratis",
      href: currentPlan ? "/dashboard" : "/auth",
      disabled: currentPlan === "free",
    },
    {
      name: "Pro",
      price: "9 EUR",
      cadence: "al mes",
      description: "Para autonomos, agencias y pequenos negocios que quieren generar documentos sin friccion.",
      features: [
        "Documentos ilimitados",
        "Catalogo Pro laboral, legal, digital e inmobiliario",
        "Exportacion Word incluida",
        "Marca personalizada en PDF y Word",
        "Biblioteca de plantillas preparada",
        "Modelo premium configurado para planes de pago",
        "Gestion de suscripcion desde Stripe",
      ],
      action: isPro ? "Plan actual" : loading ? "Conectando..." : "Actualizar a Pro",
      onClick: isPro ? undefined : startCheckout,
      href: isPro ? "/dashboard" : undefined,
      highlighted: true,
      disabled: isPro,
      badge: "Mas recomendable",
    },
    {
      name: "Empresa",
      price: "39 EUR",
      cadence: "al mes",
      description: "Preparado para equipos, workspaces y uso compartido en fases posteriores.",
      features: [
        "Workspaces preparados",
        "Roles de equipo",
        "Biblioteca documental de empresa",
        "Arquitectura multiusuario",
        "Price ID listo en Stripe",
      ],
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
            Free sirve para probar el flujo completo. Pro desbloquea uso intensivo, Word, marca y documentos avanzados.
          </p>
        </div>
      )}
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.name}
            className={`interactive relative flex h-full flex-col rounded-md p-6 ${
              card.highlighted ? "surface border-[#2d6a4f]" : "surface-flat"
            }`}
          >
            {card.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-[#2d6a4f] px-3 py-1 text-xs font-bold text-white">
                {card.badge}
              </span>
            )}
            <h3 className="text-xl font-bold">{card.name}</h3>
            <div className="mt-4 flex items-end gap-2">
              <p className="font-serif-display text-4xl font-bold text-[#2d6a4f]">{card.price}</p>
              <p className="pb-1 text-sm text-slate-500">{card.cadence}</p>
            </div>
            <p className="mt-4 min-h-14 text-sm leading-6 text-slate-600">{card.description}</p>
            <ul className="mt-5 flex-1 space-y-3 text-sm">
              {card.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#2d6a4f]" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
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
