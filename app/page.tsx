import type { Metadata } from "next";
import Link from "next/link";
import { DocumentGallery } from "@/components/DocumentGallery";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { documentTypes } from "@/lib/document-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Generador de documentos profesionales con IA",
  description:
    "Genera contratos, presupuestos, propuestas, cartas y documentos web adaptados al contexto español. Crea borradores claros y editables en minutos.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DocuGen - Generador de documentos profesionales con IA",
    description:
      "Contratos, presupuestos, propuestas y documentos web adaptados al contexto español. Borradores con IA listos para revisar.",
    url: "/",
    type: "website",
  },
};

const primaryCapabilities = [
  "Contratos, acuerdos y documentos laborales",
  "Presupuestos, propuestas y documentos comerciales",
  "Avisos legales, privacidad, web y ecommerce",
  "Cartas, reclamaciones, actas y certificados",
];

const productPaths = [
  {
    title: "Catálogo guiado",
    badge: "Free y Pro",
    text: "Elige un tipo documental, completa campos claros y genera un borrador estructurado.",
    href: "/generar",
    action: "Crear con catálogo",
  },
  {
    title: "Asistente",
    badge: "Pro",
    text: "Si no sabes qué documento necesitas, conversa con DocuGen y deja que te guíe.",
    href: "/asistente",
    action: "Abrir asistente",
  },
  {
    title: "Documento a medida",
    badge: "Pro",
    text: "Describe un documento que no existe en el catálogo y recibe un borrador personalizado.",
    href: "/generar?mode=custom",
    action: "Pedir a medida",
  },
  {
    title: "Plantillas y Mi catálogo",
    badge: "Pro y Empresa",
    text: "Guarda tipos propios o usa documentos de referencia para repetir formatos sin empezar de cero.",
    href: "/mi-catalogo",
    action: "Ver reutilización",
  },
];

const workflow = [
  ["1", "Elige cómo empezar", "Catálogo, asistente, documento a medida o una plantilla propia."],
  ["2", "Aporta los datos", "DocuGen te pide la información importante y marca lo que falte como pendiente."],
  ["3", "Revisa y exporta", "Edita el borrador, guarda versiones y descarga PDF, TXT o Word en Pro."],
];

const trustPoints = [
  "Borradores generados con IA, no documentos definitivos.",
  "Aviso de revisión profesional incluido en cada documento.",
  "Adaptado al contexto español y a un tono profesional claro.",
];

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <>
      <section className="border-b border-[#d8f3dc]/80 bg-[linear-gradient(135deg,#fffdf8_0%,#faf9f6_48%,#eef8ef_100%)]">
        <div className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div>
            <p className="eyebrow">Documentos profesionales con IA</p>
            <h1 className="font-serif-display mt-5 max-w-4xl text-5xl font-bold leading-[0.98] tracking-tight md:text-7xl">
              Genera borradores profesionales sin empezar desde cero
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              DocuGen convierte tus datos en contratos, presupuestos, propuestas, cartas y documentos web adaptados al contexto español. Tú revisas, editas y decides cómo usar el resultado.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-6 py-3 text-sm">
                {user ? "Crear documento" : "Empezar gratis"}
              </Link>
              <Link href="/catalogo" className="focus-ring btn-secondary px-6 py-3 text-sm">
                Ver qué puedo crear
              </Link>
              <Link href="/precios" className="focus-ring btn-ghost px-6 py-3 text-sm">
                Ver planes
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 text-sm sm:grid-cols-3">
              <HeroMetric value={documentTypes.length.toString()} label="tipos guiados" />
              <HeroMetric value="3" label="documentos gratis al mes" />
              <HeroMetric value="PDF · TXT · Word" label="exportaciones" />
            </div>
          </div>

          <div className="surface interactive overflow-hidden p-0">
            <div className="border-b border-[#d8f3dc] bg-[#2d6a4f] px-6 py-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8f3dc]">Ejemplo de resultado</p>
              <h2 className="mt-2 font-serif-display text-3xl font-bold">Propuesta de proyecto</h2>
            </div>
            <div className="space-y-5 p-6 text-sm leading-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewField label="Cliente" value="[PENDIENTE DE COMPLETAR]" />
                <PreviewField label="Fecha" value={new Date().toLocaleDateString("es-ES")} />
              </div>
              <div className="rounded-md bg-[#d8f3dc] p-4">
                <strong>1. Objetivo.</strong>
                <p className="mt-1">Definir alcance, entregables, plazos, precio y próximos pasos del proyecto.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewTag title="Editable" text="Copia, corrige y versiona" />
                <PreviewTag title="Exportable" text="PDF, TXT y Word Pro" />
              </div>
              <p className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-3 text-xs text-slate-600">
                Documento generado con IA. Revisar antes de su uso legal o profesional relevante.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8f3dc]/80 py-14">
        <div className="container-page grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="eyebrow">Qué hace DocuGen</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Una herramienta para preparar documentos, no para sustituir asesoramiento</h2>
            <p className="body-muted mt-4">
              La app te ayuda a pasar de una necesidad concreta a un borrador claro, editable y ordenado. Después puedes revisarlo tú o llevarlo a un profesional cuando el uso lo requiera.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryCapabilities.map((item) => (
              <div key={item} className="surface-flat p-5">
                <span className="badge badge-free">Incluido</span>
                <p className="mt-3 font-bold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8f3dc]/80 bg-[#f2efe8]/64 py-16">
        <div className="container-page">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow">Formas de trabajar</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Empieza por donde tenga sentido para ti</h2>
            <p className="body-muted mt-3">
              Para usuarios nuevos, el catálogo guiado es el camino más sencillo. Pro añade asistente, documentos a medida, plantillas y tipos guardados en Mi catálogo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {productPaths.map((item) => (
              <Link key={item.title} href={user ? item.href : item.href === "/generar" || item.href === "/catalogo" ? item.href : "/auth"} className="surface-flat interactive p-5">
                <span className="badge badge-pro">{item.badge}</span>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                <span className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">{item.action}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8f3dc]/80 py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Tres pasos, sin pantalla en blanco</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map(([step, title, text]) => (
              <div key={step} className="surface-flat interactive p-6">
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

      <section className="border-y border-[#d8f3dc]/80 bg-[#f2efe8]/64 py-16">
        <div className="container-page grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow">Uso responsable</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Claro, profesional y prudente</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point} className="surface-flat p-5">
                <p className="text-sm font-semibold leading-6">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="surface flex flex-wrap items-center justify-between gap-5 p-6 lg:p-8">
          <div className="max-w-2xl">
            <p className="eyebrow">Empieza ahora</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Crea tu primer borrador gratis y comprueba si te ahorra tiempo</h2>
            <p className="body-muted mt-3">No necesitas tarjeta para probar el flujo básico. Puedes actualizar a Pro cuando necesites Word, plantillas o documentos a medida.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-6 py-3 text-sm">
              {user ? "Crear documento" : "Registrarme gratis"}
            </Link>
            <Link href="/precios" className="focus-ring btn-secondary px-6 py-3 text-sm">
              Comparar planes
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page">
        <LegalDisclaimer />
      </section>
    </>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="surface-flat p-4">
      <p className="font-serif-display text-2xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/78 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function PreviewTag({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#fffdf8]/78 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{title}</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}