"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DangerZone() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clearHistory() {
    if (!window.confirm("Borrar todos tus documentos? Esta accion no se puede deshacer.")) {
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
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface rounded-md p-6">
      <p className="eyebrow">Zona de peligro</p>
      <h2 className="font-serif-display mt-3 text-3xl font-bold">Documentos</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Puedes borrar todos los documentos guardados. Esto no reinicia el contador mensual de documentos generados.
      </p>
      <button
        type="button"
        onClick={clearHistory}
        disabled={loading}
        className="focus-ring mt-6 rounded-md border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
      >
        {loading ? "Borrando..." : "Borrar todos los documentos"}
      </button>
      {message && <p className="mt-4 rounded-md bg-[#d8f3dc] p-3 text-sm text-[#1f2933]">{message}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
