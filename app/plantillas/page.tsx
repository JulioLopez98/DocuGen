import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlanBadge } from "@/components/PlanBadge";
import { getCurrentProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Plantillas",
  robots: {
    index: false,
    follow: false,
  },
};

const upcomingFeatures = [
  "Subida de documentos Word y PDF propios",
  "Biblioteca privada por usuario y workspace",
  "Extraccion de texto para usar documentos como referencia",
  "Generacion siguiendo estructura, tono y clausulas internas",
  "Base preparada para estilo documental de empresa",
];

export default async function TemplatesPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const isFree = profile.plan === "free";

  return (
    <section className="container-page py-10">
      <div className="surface overflow-hidden rounded-md">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="eyebrow">Plantillas</p>
            <h1 className="font-serif-display mt-3 max-w-4xl text-5xl font-bold leading-tight">
              Tu biblioteca de documentos propios
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              La proxima fase de DocuGen permitira subir documentos Word/PDF de tu empresa para generar nuevos
              borradores siguiendo tu estructura, tono, estilo y clausulas habituales.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isFree ? (
                <Link href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                  Desbloquear con Pro
                </Link>
              ) : (
                <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
                  Seguir generando
                </Link>
              )}
              <Link href="/catalogo" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Ver catalogo actual
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-[#d8f3dc] bg-white/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#2d6a4f]">Estado</p>
              <PlanBadge plan={profile.plan} />
            </div>
            <p className="mt-4 font-serif-display text-3xl font-bold">{isFree ? "Proximamente Pro" : "Proximamente"}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isFree
                ? "La biblioteca de plantillas estara orientada a usuarios Pro y Empresa."
                : "Tu plan ya esta preparado para usar esta funcion cuando activemos la subida de plantillas."}
            </p>
          </aside>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Sube documentos", "Word/PDF con plantillas, ejemplos, clausulas o documentos anteriores."],
          ["2", "DocuGen extrae estructura", "Se analizara el texto para detectar tono, apartados y patrones utiles."],
          ["3", "Genera con referencia", "Podras crear nuevos documentos inspirados en tu biblioteca privada."],
        ].map(([step, title, text]) => (
          <article key={step} className="surface-flat rounded-md p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">
              {step}
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="surface mt-6 rounded-md p-6">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="eyebrow">Roadmap</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Lo que vamos a construir</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Esta pantalla queda lista como punto de entrada para el Template Library MVP.
            </p>
          </div>
          <div className="grid gap-3">
            {upcomingFeatures.map((feature) => (
              <div key={feature} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4 text-sm font-semibold">
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
