import type { Metadata } from "next";
import Link from "next/link";
import { DocumentGallery } from "@/components/DocumentGallery";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { documentTypes } from "@/lib/document-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Generador de documentos profesionales con IA",
  description:
    "Genera contratos, presupuestos, propuestas, cartas y documentos web adaptados al contexto espanol. Crea borradores claros y editables en minutos.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DocuGen - Generador de documentos profesionales con IA",
    description:
      "Contratos, presupuestos, propuestas y documentos web adaptados al contexto espanol. Borradores con IA listos para revisar.",
    url: "/",
    type: "website",
  },
};

const useCases = [
  {
    title: "Profesionales independientes",
    text: "Contratos freelance, propuestas y presupuestos con estructura profesional para clientes en Espana.",
  },
  {
    title: "Pequenas empresas",
    text: "Borradores rapidos para operaciones habituales: colaboraciones, NDAs, documentacion web y cartas.",
  },
  {
    title: "Equipos que documentan mucho",
    text: "Historial, regeneracion, exportaciones y base preparada para marca, Word y workspaces.",
  },
];

const workflow = [
  ["1", "Elige el documento", "Selecciona el tipo exacto y DocuGen adapta el formulario a ese caso."],
  ["2", "Completa los datos", "Rellena campos claros. Si falta informacion, el borrador deja marcadores pendientes."],
  ["3", "Revisa y exporta", "Obtienes un texto editable que puedes copiar, descargar en PDF/TXT o exportar a Word con Pro."],
];

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <>
      <section className="border-b border-[#d8f3dc]/80">
        <div className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 lg:grid-cols-[1.03fr_0.97fr] lg:py-16">
          <div>
            <p className="eyebrow">Documentos profesionales con IA</p>
            <h1 className="font-serif-display mt-5 max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl">
              Convierte una idea en un borrador listo para revisar
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              DocuGen ayuda a crear contratos, presupuestos, propuestas, NDAs, cartas y documentos web adaptados al
              contexto espanol. No sustituye a un profesional: acelera el primer borrador para que empieces con una base
              clara.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-6 py-3 text-sm">
                {user ? "Crear documento" : "Empezar gratis"}
              </Link>
              <Link href="/precios" className="focus-ring btn-secondary px-6 py-3 text-sm">
                Ver precios
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm sm:grid-cols-3">
              {[
                [documentTypes.length.toString(), "tipos de documento"],
                ["3", "gratis al mes"],
                ["PDF", "TXT y Word Pro"],
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
              <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#1f2933]">IA + revision</span>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6">
              <h2 className="font-serif-display text-2xl font-bold">Propuesta de proyecto</h2>
              <p>Fecha: {new Date().toLocaleDateString("es-ES")}</p>
              <p>
                Proveedor: [PENDIENTE DE COMPLETAR]
                <br />
                Cliente: [PENDIENTE DE COMPLETAR]
              </p>
              <div className="rounded-md bg-[#d8f3dc] p-4">
                <strong>1. Objetivo.</strong>
                <p className="mt-1">Definir el alcance, entregables, plazos y condiciones del proyecto solicitado.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-[#d8f3dc] bg-white/78 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Exporta</p>
                  <p className="mt-1">PDF, TXT y Word Pro</p>
                </div>
                <div className="rounded-md border border-[#d8f3dc] bg-white/78 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Guarda</p>
                  <p className="mt-1">Historial y regeneracion</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Documento generado con IA. Revisar antes de su uso legal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white/58 py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Que resuelve</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Menos pantalla en blanco, mas documento util</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="surface-flat interactive rounded-md p-5">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d8f3dc]/80 py-16">
        <div className="container-page">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">Como funciona</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Un flujo sencillo para trabajar rapido</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map(([step, title, text]) => (
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

      <section className="container-page">
        <LegalDisclaimer />
      </section>
    </>
  );
}
