"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { BrandSettings } from "@/lib/supabase-server";

type BrandSettingsFormProps = {
  initialSettings: BrandSettings | null;
  userId: string;
  isPro: boolean;
};

type FormState = {
  company_name: string;
  cif: string;
  address: string;
  logo_url: string;
};

export function BrandSettingsForm({ initialSettings, userId, isPro }: BrandSettingsFormProps) {
  const [form, setForm] = useState<FormState>({
    company_name: initialSettings?.company_name || "",
    cif: initialSettings?.cif || "",
    address: initialSettings?.address || "",
    logo_url: initialSettings?.logo_url || "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hasLogo = Boolean(form.logo_url);
  const hasBrandData = Boolean(form.company_name || form.cif || form.address || form.logo_url);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setError("Supabase no está configurado.");
        return;
      }

      const extension = file.name.split(".").pop() || "png";
      const path = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("brand-logos").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadError) {
        setError("No se pudo subir el logo. Revisa el bucket brand-logos.");
        return;
      }

      const { data } = supabase.storage.from("brand-logos").getPublicUrl(path);
      updateField("logo_url", data.publicUrl);
      setMessage("Logo subido. Guarda los cambios para aplicarlo.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/brand-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "No se pudieron guardar los cambios.");
        return;
      }

      setMessage("Marca guardada correctamente.");
    } catch {
      setError("No se pudieron guardar los ajustes porque DocuGen no respondió. Inténtalo de nuevo en unos segundos.");
    } finally {
      setSaving(false);
    }
  }

  if (!isPro) {
    return (
      <EmptyState
        eyebrow="Marca Pro"
        title="Identidad de marca para tus exportaciones"
        description="Añade nombre de empresa, CIF, dirección y logo para preparar documentos con una presencia más corporativa. Esta función está disponible en DocuGen Pro."
        primaryAction={{ href: "/precios", label: "Ver planes Pro" }}
        secondaryAction={{ href: "/generar", label: "Seguir generando" }}
      />
    );
  }

  return (
    <form onSubmit={save} className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Marca Pro</p>
          <h2 className="panel-title mt-3">Identidad de marca</h2>
          <p className="body-muted mt-3 max-w-2xl">
            Estos datos aparecerán en exportaciones PDF y Word cuando el formato lo permita. Úsalos para que los documentos salgan con presencia de empresa.
          </p>
          {!hasBrandData && (
            <p className="status-note mt-4">Aún no tienes marca configurada. Completa al menos el nombre de empresa o sube un logo para que empiece a aparecer en tus exportaciones.</p>
          )}
        </div>
        <span className="badge badge-pro">
          Pro activo
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold">Nombre de empresa</span>
          <input
            value={form.company_name}
            onChange={(event) => updateField("company_name", event.target.value)}
            className="field-control mt-2"
            placeholder="DocuGen Studio S.L."
          />
        </label>
        <label>
          <span className="text-sm font-semibold">CIF/NIF</span>
          <input
            value={form.cif}
            onChange={(event) => updateField("cif", event.target.value)}
            className="field-control mt-2"
            placeholder="B00000000"
          />
        </label>
        <label className="md:col-span-2">
          <span className="text-sm font-semibold">Dirección</span>
          <input
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="field-control mt-2"
            placeholder="Calle, número, ciudad"
          />
        </label>
      </div>

      <section className="surface-flat mt-6 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Logo de marca</h3>
            <p className="body-muted mt-1">
              Sube un PNG, JPG, WebP o SVG, o pega una URL pública si ya lo tienes alojado.
            </p>
          </div>
          <label className="focus-ring btn-secondary cursor-pointer px-4 py-2 text-sm">
            {uploading ? "Subiendo..." : "Subir logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadLogo(file);
                }
              }}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[120px_1fr]">
          <div className="flex h-28 w-28 items-center justify-center rounded-md border border-[#d8f3dc] bg-[#fffdf8] p-3">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Logo de marca" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-xs font-semibold text-slate-400">Sin logo</span>
            )}
          </div>

          <div>
            <label>
              <span className="text-sm font-semibold">URL del logo</span>
              <input
                value={form.logo_url}
                onChange={(event) => updateField("logo_url", event.target.value)}
                className="field-control mt-2"
                placeholder="https://..."
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {hasLogo && (
                <button
                  type="button"
                  onClick={() => updateField("logo_url", "")}
                  className="focus-ring rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Quitar logo
                </button>
              )}
              <p className="text-xs leading-5 text-slate-500">
                Se añadirá en Word y PDF como referencia visual de marca cuando el formato lo permita.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || uploading} className="focus-ring btn-primary px-5 py-3 text-sm disabled:opacity-60">
          {saving ? "Guardando..." : uploading ? "Subiendo logo..." : "Guardar marca"}
        </button>

      </div>
      {message && <p className="status-success mt-4">{message}</p>}
      {error && <p className="status-error mt-4">{error}</p>}
    </form>
  );
}
