"use client";

import Link from "next/link";
import { useState } from "react";

type SaveToCatalogCardProps = {
  documentId: string;
  title: string;
  variant?: "card" | "button";
  initialCatalogType?: { id: string; label: string } | null;
};

export function SaveToCatalogCard({ documentId, title, variant = "card", initialCatalogType = null }: SaveToCatalogCardProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "exists">(initialCatalogType ? "exists" : "idle");
  const [catalogType, setCatalogType] = useState(initialCatalogType);
  const [error, setError] = useState<string | null>(null);

  async function saveToCatalog() {
    if (state === "saving") {
      return;
    }

    setError(null);
    setState("saving");

    try {
      const response = await fetch("/api/personal-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, label: title }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        alreadyExists?: boolean;
        catalogType?: { id: string; label: string };
      } | null;

      if (!response.ok) {
        throw new Error(data?.message || "No se pudo guardar en Mi catálogo.");
      }

      setCatalogType(data?.catalogType || null);
      setState(data?.alreadyExists ? "exists" : "saved");
    } catch (saveError) {
      setState("idle");
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar en Mi catálogo.");
    }
  }

  const saved = state === "saved" || state === "exists";
  const openCatalogHref = catalogType ? "/generar?mode=community&communityTypeId=" + catalogType.id : "/generar?mode=community";

  if (variant === "button") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void saveToCatalog()}
          disabled={state === "saving" || saved}
          className="focus-ring btn-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "saving" ? "Guardando..." : saved ? "En Mi catálogo" : "Guardar en Mi catálogo"}
        </button>
        {saved && (
          <Link href={openCatalogHref} className="focus-ring btn-ghost px-3 py-2 text-sm">
            Abrir
          </Link>
        )}
        {error && <p className="basis-full text-xs font-semibold text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#2d6a4f]/30 bg-[#f4fbf5] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#2d6a4f]">Guardar como tipo reutilizable</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Si este documento te sirve como formato recurrente, guárdalo en Mi catálogo para crearlo de nuevo desde Crear.
          </p>
          {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
          {saved && (
            <p className="mt-2 text-xs font-semibold text-[#2d6a4f]">
              {state === "exists" ? "Ya estaba guardado en Mi catálogo." : "Guardado en Mi catálogo."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveToCatalog()}
            disabled={state === "saving" || saved}
            className="focus-ring btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "saving" ? "Guardando..." : saved ? "Guardado" : "Guardar en Mi catálogo"}
          </button>
          {saved && (
            <Link href={openCatalogHref} className="focus-ring btn-secondary px-3 py-2 text-xs">
              Abrir Mi catálogo
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
