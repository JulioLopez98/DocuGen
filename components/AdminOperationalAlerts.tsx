"use client";

import { useState, useTransition } from "react";
import type { OperationalAlertRow } from "@/lib/operational-alerts";

type AdminProfileLite = {
  id: string;
  email: string | null;
};

export function AdminOperationalAlerts({
  alerts,
  profiles,
}: {
  alerts: OperationalAlertRow[];
  profiles: AdminProfileLite[];
}) {
  const [items, setItems] = useState(alerts);
  const [isPending, startTransition] = useTransition();
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const openAlerts = items.filter((alert) => alert.status !== "resolved");

  const resolveAlert = (id: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/operational-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { alert: OperationalAlertRow };
      setItems((current) => current.map((alert) => (alert.id === id ? data.alert : alert)));
    });
  };

  return (
    <section className="surface mt-4 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Alertas</p>
          <h2 className="panel-title mt-3">Operativa interna</h2>
          <p className="body-muted mt-2 max-w-2xl">
            Avisos accionables generados desde eventos de seguridad. Resuélvelos cuando ya estén revisados.
          </p>
        </div>
        <span className={openAlerts.length > 0 ? "badge bg-red-50 text-red-700" : "badge badge-pro"}>
          {openAlerts.length} abiertas
        </span>
      </div>

      <div className="grid gap-3">
        {openAlerts.slice(0, 8).map((alert) => (
          <article key={alert.id} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-white/75 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${getSeverityClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="badge badge-free">
                    {formatAlertType(alert.alert_type)}
                  </span>
                </div>
                <h3 className="mt-3 font-serif-display text-2xl font-bold">{alert.title}</h3>
                <p className="body-muted mt-2">{alert.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {alert.user_id ? profileById.get(alert.user_id)?.email || "Usuario no disponible" : "Sistema"} ·{" "}
                  {new Date(alert.created_at).toLocaleString("es-ES")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => resolveAlert(alert.id)}
                disabled={isPending}
                className="focus-ring btn-secondary px-3 py-2 text-xs disabled:opacity-60"
              >
                Resolver
              </button>
            </div>
          </article>
        ))}

        {openAlerts.length === 0 && (
          <div className="status-success p-6">
            <p className="text-sm font-bold text-[#2d6a4f]">Sin alertas abiertas</p>
            <p className="mt-2 text-sm text-slate-600">
              Cuando haya eventos de alta severidad o avisos operativos, aparecerán aquí.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatAlertType(type: string) {
  const labels: Record<string, string> = {
    rate_limit_blocked: "Rate limit",
  };

  return labels[type] || type;
}

function getSeverityClass(severity: OperationalAlertRow["severity"]) {
  if (severity === "high") {
    return "bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}
