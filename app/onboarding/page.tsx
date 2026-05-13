import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { documentTypes, requiresPro, type DocumentType } from "@/lib/document-types";
import { getCurrentProfile } from "@/lib/supabase-server";

const recommendedTypes: DocumentType[] = [
  "contrato-freelance",
  "presupuesto-comercial",
  "propuesta-proyecto",
  "carta-presentacion",
  "aviso-legal",
  "factura-proforma",
];

export const metadata: Metadata = {
  title: "Primer documento",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!supabase || !user || !profile) {
    redirect("/auth");
  }

  const { count } = await supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  if ((count || 0) > 0) {
    redirect("/dashboard");
  }

  const recommendedDocuments = documentTypes.filter((doc) => recommendedTypes.includes(doc.type));
  const isFree = profile.plan === "free";

  return (
    <section className="container-page py-10">
      <div className="surface overflow-hidden rounded-md">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="eyebrow">Primer documento</p>
            <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight">Vamos a crear tu primer borrador</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Elige un documento habitual, completa los campos y revisa el resultado. DocuGen guardara el borrador en tu
              historial para que puedas descargarlo o reutilizarlo despues.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
                Ver catalogo completo
              </Link>
              <Link href="/dashboard" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Saltar por ahora
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-[#d8f3dc] bg-white/78 p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Tu plan actual</p>
            <p className="mt-2 font-serif-display text-3xl font-bold capitalize">{profile.plan}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isFree
                ? "Free incluye 3 documentos al mes y los tipos esenciales para probar el flujo."
                : "Tu plan permite documentos ilimitados y acceso a tipos Pro."}
            </p>
          </aside>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Elige un tipo", "Empieza con un documento habitual o busca dentro del catalogo completo."],
          ["2", "Rellena campos", "Usa datos reales o deja informacion pendiente para completarla despues."],
          ["3", "Exporta y reutiliza", "Descarga PDF/TXT, Word si eres Pro, o usa el historial como plantilla."],
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

      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Recomendados</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Elige un buen punto de partida</h2>
          </div>
          <Link href="/precios" className="btn-ghost px-3 py-2 text-sm">
            Ver planes
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendedDocuments.map((doc) => (
            <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive rounded-md p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6a4f]">{doc.category}</p>
                {requiresPro(doc) && <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold text-white">Pro</span>}
              </div>
              <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
              <span className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">Crear ahora</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
