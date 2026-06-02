"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DangerZone() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clearHistory() {
    if (!window.confirm("¿Borrar todos tus documentos? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/documents/clear", { method: "DELETE" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudieron borrar los documentos.");
        return;
      }

      setMessage("Documentos borrados correctamente.");
      router.refresh();
    } catch {
      setError("No se pudo borrar el historial porque DocuGen no respondió. Inténtalo de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface p-6">
      <p className="eyebrow">Zona de peligro</p>
      <h2 className="panel-title mt-3">Limpieza de documentos</h2>
      <p className="body-muted mt-3">
        Puedes borrar todos los documentos guardados. Esto no reinicia el contador mensual de documentos generados.
      </p>
      <button
        type="button"
        onClick={clearHistory}
        disabled={loading}
        className="focus-ring mt-6 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        {loading ? "Borrando..." : "Borrar todos los documentos"}
      </button>
      {message && <p className="status-success mt-4">{message}</p>}
      {error && <p className="status-error mt-4">{error}</p>}
    </section>
  );
}
