"use client";

import Link from "next/link";
import { useState } from "react";

type PricingCardsProps = {
  compact?: boolean;
  currentPlan?: "free" | "pro" | "empresa" | null;
  empresaCheckoutEnabled?: boolean;
  hasManagedSubscription?: boolean;
};

export function PricingCards({ compact, currentPlan, empresaCheckoutEnabled = false, hasManagedSubscription = false }: PricingCardsProps) {
  const [loading, setLoading] = useState<"free" | "pro" | "empresa" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPro = currentPlan === "pro";
  const isEmpresa = currentPlan === "empresa";

  async function startCheckout(plan: "pro" | "empresa") {
    setLoading(plan);
    setError(null);

    try {
      const endpoint = currentPlan && currentPlan !== "free" && hasManagedSubscription ? "/api/subscription/change-plan" : "/api/create-checkout";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudo iniciar el cambio de plan.");
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

  async function scheduleFree() {
    const manualPlan = Boolean(currentPlan && currentPlan !== "free" && !hasManagedSubscription);
    const confirmed = manualPlan
      ? window.confirm("Vas a volver al plan Free. Este plan viene de un codigo o activacion manual, asi que no se cancela ningun pago en Stripe. ¿Quieres continuar?")
      : window.confirm("Vas a cancelar la suscripcion. Mantendras tu plan hasta el final del periodo ya pagado y despues pasaras a Free. No se devuelve el importe del periodo actual. ¿Quieres continuar?");

    if (!confirmed) {
      return;
    }

    setLoading("free");
    setError(null);

    try {
      const response = manualPlan
        ? await fetch("/api/downgrade-free", { method: "POST" })
        : await fetch("/api/subscription/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel_at_period_end" }),
          });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || (manualPlan ? "No se pudo volver al plan Free." : "No se pudo programar el paso a Free."));
        return;
      }

      window.location.href = manualPlan ? "/dashboard?plan=free" : "/dashboard?plan_scheduled=free";
    } catch {
      setError(manualPlan ? "No se pudo conectar con DocuGen. Espera unos segundos y vuelve a intentarlo." : "No se pudo conectar con Stripe. Espera unos segundos y vuelve a intentarlo.");
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
        "Mayoría del catálogo base incluida",
        "1 documento a medida de prueba/mes",
        "Historial básico",
        "Exportación PDF y TXT",
        "Avisos de revisión profesional incluidos",
      ],
      action: currentPlan === "free" ? "Plan actual" : currentPlan ? (loading === "free" ? "Cambiando..." : hasManagedSubscription ? "Pasar a Free al final del periodo" : "Volver a Free") : "Empezar gratis",
      href: currentPlan ? undefined : "/auth",
      onClick: currentPlan && currentPlan !== "free" ? scheduleFree : undefined,
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
        "Documentos a medida ilimitados",
        "Gestión de suscripción desde Stripe",
      ],
      action: isPro
        ? "Plan actual"
        : loading === "pro"
          ? "Programando..."
          : isEmpresa
            ? hasManagedSubscription ? "Cambiar a Pro al final del periodo" : "Contratar Pro con Stripe"
            : "Actualizar a Pro",
      onClick: isPro ? undefined : () => startCheckout("pro"),
      href: isPro ? "/dashboard" : undefined,
      highlighted: true,
      disabled: isPro,
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
              ? hasManagedSubscription ? "Cambiar a Empresa" : "Contratar Empresa"
              : "Actualizar a Empresa",
      onClick: isEmpresa || !empresaCheckoutEnabled ? undefined : () => startCheckout("empresa"),
      href: isEmpresa ? "/workspace" : undefined,
      disabled: isEmpresa || !empresaCheckoutEnabled,
      helper: !isEmpresa && !empresaCheckoutEnabled
        ? "Anade STRIPE_PRICE_ID_EMPRESA para vender Empresa."
        : isPro
          ? hasManagedSubscription
            ? "Subida inmediata con prorrateo automatico de Stripe."
            : "Tu Pro actual es manual. Si contratas Empresa, Stripe empezara una suscripcion nueva."
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
            Free sirve para probar el flujo completo con catálogo base y 1 documento a medida al mes. Pro desbloquea uso intensivo, Word, marca, asistente y plantillas.
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

