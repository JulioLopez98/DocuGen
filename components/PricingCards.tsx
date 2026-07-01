"use client";

import Link from "next/link";
import { useState } from "react";

type PricingCardsProps = {
  compact?: boolean;
  currentPlan?: "free" | "pro" | "empresa" | null;
  empresaCheckoutEnabled?: boolean;
};

export function PricingCards({ compact, currentPlan, empresaCheckoutEnabled = false }: PricingCardsProps) {
  const [loading, setLoading] = useState<"pro" | "empresa" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPro = currentPlan === "pro";
  const isEmpresa = currentPlan === "empresa";

  async function startCheckout(plan: "pro" | "empresa") {
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (!response.ok || !payload.url) {
        setError(payload.message || "No se pudo iniciar el pago.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("No se pudo conectar con Stripe. Espera unos segundos y vuelve a intentarlo.");
    } finally {
      setLoading(null);
    }
  }

  const cards = [
    {
      name: "Free",
      segment: "Para probar",
      price: "0 EUR",
      cadence: "sin tarjeta",
      description: "Ideal para validar DocuGen, crear borradores puntuales y probar el flujo completo.",
      features: [
        "3 documentos gratis al mes",
        "Tipos esenciales incluidos",
        "Historial básico",
        "Exportación PDF y TXT",
        "Avisos de revisión profesional incluidos",
      ],
      action: currentPlan ? "Plan inicial" : "Empezar gratis",
      href: currentPlan ? "/dashboard" : "/auth",
      disabled: currentPlan === "free",
    },
    {
      name: "Pro",
      segment: "Para uso recurrente",
      price: "9 EUR",
      cadence: "al mes",
      description: "Para autónomos, agencias y pequeños negocios que generan documentos con frecuencia.",
      features: [
        "Documentos ilimitados",
        "Catálogo completo + tipos Pro",
        "Exportación Word incluida",
        "Marca personalizada en PDF y Word",
        "Biblioteca de plantillas",
        "Documentos a medida",
        "Gestión de suscripción desde Stripe",
      ],
      action: isPro ? "Plan actual" : loading === "pro" ? "Conectando..." : isEmpresa ? "Incluido en Empresa" : "Actualizar a Pro",
      onClick: isPro || isEmpresa ? undefined : () => startCheckout("pro"),
      href: isPro || isEmpresa ? "/dashboard" : undefined,
      highlighted: true,
      disabled: isPro || isEmpresa,
      badge: "Más recomendable",
    },
    {
      name: "Empresa",
      segment: "Para equipos",
      price: "39 EUR",
      cadence: "al mes",
      description: "Para equipos que necesitan roles, documentos compartidos y biblioteca documental interna.",
      features: [
        "Todo lo incluido en Pro",
        "Espacios de equipo",
        "Roles avanzados",
        "Biblioteca documental de empresa",
        "Actividad, auditoría y notificaciones",
        "Colaboración multiusuario",
      ],
      action: isEmpresa
        ? "Plan actual"
        : !empresaCheckoutEnabled
          ? "Empresa pronto"
          : loading === "empresa"
            ? "Conectando..."
            : isPro
              ? "Cambiar a Empresa"
              : "Actualizar a Empresa",
      onClick: isEmpresa || !empresaCheckoutEnabled ? undefined : () => startCheckout("empresa"),
      href: isEmpresa ? "/workspace" : undefined,
      disabled: isEmpresa || !empresaCheckoutEnabled,
      helper: !isEmpresa && !empresaCheckoutEnabled
        ? "Añade STRIPE_PRICE_ID_EMPRESA para vender Empresa."
        : isPro
          ? "Se abrirá el portal de Stripe para cambiar tu suscripción."
          : undefined,
    },
  ];

  return (
    <section id="precios" className={compact ? "" : "container-page py-16 scroll-mt-24"}>
      {!compact && (
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Precios</p>
          <h2 className="panel-title mt-3">Empieza gratis y crece cuando lo necesites</h2>
          <p className="body-muted mt-3">
            Free sirve para probar el flujo completo. Pro desbloquea uso intensivo, Word, marca y documentos avanzados.
          </p>
        </div>
      )}
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.name}
            className={`interactive flex h-full flex-col p-6 ${
              card.highlighted ? "surface border-[#2d6a4f] md:-translate-y-2" : "surface-flat"
            }`}
          >
            <div className="flex min-h-12 flex-wrap items-start justify-between gap-2">
              <p className="eyebrow max-w-[12rem] leading-5">{card.segment}</p>
              {card.badge && <span className="badge badge-pro shrink-0 whitespace-nowrap">{card.badge}</span>}
            </div>
            <h3 className="mt-2 text-2xl font-bold">{card.name}</h3>
            <div className="mt-4 flex items-end gap-2">
              <p className="font-serif-display text-4xl font-bold text-[#2d6a4f]">{card.price}</p>
              <p className="pb-1 text-sm text-slate-500">{card.cadence}</p>
            </div>
            <p className="body-muted mt-4 min-h-20">{card.description}</p>
            <ul className="mt-5 flex-1 space-y-3 text-sm">
              {card.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#d8f3dc] text-[10px] font-bold text-[#2d6a4f]" aria-hidden="true">+</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {card.onClick ? (
              <button
                type="button"
                onClick={card.onClick}
                disabled={loading !== null || card.disabled}
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
              <span className="mt-6 block w-full rounded-xl bg-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                {card.action}
              </span>
            )}
            {card.helper && <p className="status-note mt-3 text-xs">{card.helper}</p>}
          </div>
        ))}
      </div>
      <div className="status-note mt-6 grid gap-2 text-xs sm:grid-cols-3">
        <p><strong>Sin permanencia:</strong> puedes cancelar cuando quieras.</p>
        <p><strong>Stripe seguro:</strong> DocuGen no guarda datos de tarjeta.</p>
        <p><strong>Acceso claro:</strong> si cancelas, mantienes el plan hasta fin del periodo pagado.</p>
      </div>
      {error && <p className="status-error mt-4">{error}</p>}
    </section>
  );
}
