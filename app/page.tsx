import Link from "next/link";
import { DocumentGallery } from "@/components/DocumentGallery";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PricingCards } from "@/components/PricingCards";
import { createSupabaseServerClient, type Profile } from "@/lib/supabase-server";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } =
    supabase && user ? await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>() : { data: null };

  return (
    <>
      <section>
        <div className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <p className="eyebrow">SaaS documental con IA</p>
            <h1 className="font-serif-display mt-5 max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl">
              Genera documentos profesionales en minutos con IA
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Contratos, presupuestos, propuestas, NDAs y documentos web adaptados al contexto español. Ahorra tiempo
              creando borradores claros, editables y listos para revisar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-6 py-3 text-sm">
                {user ? "Crear documento" : "Registrarme gratis"}
              </Link>
              <Link href={user ? "/dashboard" : "/generar"} className="focus-ring btn-secondary px-6 py-3 text-sm">
                {user ? "Ir al dashboard" : "Ver generador"}
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              {[
                ["8", "tipos iniciales"],
                ["PDF", "y TXT"],
                ["España", "tono adaptado"],
              ].map(([value, label]) => (
                <div key={value} className="surface-flat rounded-md p-4">
                  <p className="font-serif-display text-2xl font-bold text-[#2d6a4f]">{value}</p>
                  <p className="mt-1 text-xs text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface interactive rounded-md p-6">
            <div className="flex items-center justify-between gap-3 border-b border-[#d8f3dc] pb-4">
              <p className="text-sm font-semibold text-[#2d6a4f]">Vista de borrador</p>
              <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#1f2933]">IA</span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6">
              <h2 className="font-serif-display text-2xl font-bold">Contrato de prestación de servicios</h2>
              <p>En Madrid, a {new Date().toLocaleDateString("es-ES")}.</p>
              <p>
                Reunidos, de una parte [PENDIENTE DE COMPLETAR], y de otra [PENDIENTE DE COMPLETAR], acuerdan...
              </p>
              <div className="rounded-md bg-[#d8f3dc] p-4">
                <strong>1. Objeto.</strong>
                <p className="mt-1">El presente documento regula la prestación de los servicios descritos por las partes.</p>
              </div>
              <p className="text-xs text-slate-500">Documento generado con IA. Revisar antes de su uso legal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8f3dc]/80 bg-white/62 py-16">
        <div className="container-page">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Tres pasos, sin fricción</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["1", "Elige un documento", "Selecciona entre contratos, propuestas, presupuestos y documentos web."],
              ["2", "Rellena los datos", "Usa formularios guiados con campos claros y validación profesional."],
              ["3", "Revisa y exporta", "Obtén un borrador editable en pantalla y descárgalo en PDF o TXT."],
            ].map(([step, title, text]) => (
              <div key={step} className="surface-flat interactive rounded-md p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">
                  {step}
                </span>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DocumentGallery />
      <PricingCards currentPlan={profile?.plan} />
      <section className="container-page">
        <LegalDisclaimer />
      </section>
    </>
  );
}
