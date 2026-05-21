import type { Metadata } from "next";
import Link from "next/link";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PricingCards } from "@/components/PricingCards";
import { documentTypes, requiresPro } from "@/lib/document-types";
import { createSupabaseServerClient, type Profile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Precios de DocuGen",
  description:
    "Compara DocuGen Free, Pro y Empresa. Empieza gratis y desbloquea documentos ilimitados, Word, marca personalizada y workspaces de equipo.",
  alternates: {
    canonical: "/precios",
  },
  openGraph: {
    title: "Precios de DocuGen | Free, Pro y Empresa",
    description:
      "Empieza gratis y actualiza a Pro o Empresa cuando necesites documentos ilimitados, Word, marca personalizada y trabajo en equipo.",
    url: "/precios",
    type: "website",
  },
};

type DocumentTypeItem = (typeof documentTypes)[number];

const comparisonRows = [
  { label: "Documentos al mes", free: "3", pro: "Ilimitados", empresa: "Ilimitados" },
  { label: "Plantillas disponibles", free: "Esenciales", pro: "Catalogo completo + Pro", empresa: "Catalogo + biblioteca de equipo" },
  { label: "Exportacion", free: "PDF y TXT", pro: "PDF, TXT y Word", empresa: "PDF, TXT y Word" },
  { label: "Marca personalizada", free: "No incluida", pro: "Logo y datos de empresa", empresa: "Marca compartida de empresa" },
  { label: "Workspaces", free: "No incluido", pro: "Personal", empresa: "Equipo y roles" },
  { label: "Roles", free: "No incluido", pro: "Usuario unico", empresa: "Admin, Editor, Miembro y Solo lectura" },
  { label: "Actividad y avisos", free: "No incluido", pro: "Personal", empresa: "Auditoria y notificaciones internas" },
  { label: "Suscripcion", free: "Sin tarjeta", pro: "Gestion desde portal Stripe", empresa: "Gestion desde portal Stripe" },
];

const faqs = [
  {
    question: "DocuGen sustituye a un asesor legal?",
    answer:
      "No. DocuGen genera borradores profesionales con IA. Los documentos deben revisarse por un profesional cuando vayan a usarse con efectos legales o laborales relevantes.",
  },
  {
    question: "Puedo cancelar Pro cuando quiera?",
    answer:
      "Si. Desde el dashboard puedes abrir el portal de cliente de Stripe para gestionar o cancelar la suscripcion.",
  },
  {
    question: "Que pasa si sigo en Free?",
    answer:
      "Puedes crear hasta 3 documentos al mes, descargar PDF/TXT y guardar historial basico. Los documentos avanzados y Word quedan bloqueados para Pro.",
  },
  {
    question: "Word esta incluido en Pro?",
    answer:
      "Si. El plan Pro permite descargar documentos en Word y aplicar marca personalizada cuando la tengas configurada.",
  },
];

function groupByCategory(items: readonly DocumentTypeItem[]) {
  return items.reduce<Record<string, DocumentTypeItem[]>>((groups, item) => {
    groups[item.category] = [...(groups[item.category] || []), item];
    return groups;
  }, {});
}

export default async function PricingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } =
    supabase && user ? await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>() : { data: null };
  const proDocuments = documentTypes.filter(requiresPro);
  const groupedProDocuments = groupByCategory(proDocuments);
  const planLabel = profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : null;

  return (
    <section>
      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="eyebrow">Precios</p>
            <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight md:text-6xl">
              Elige si DocuGen es una ayuda puntual o tu herramienta diaria.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Empieza gratis, crea tus primeros borradores y pasa a Pro cuando necesites volumen, documentos avanzados,
              Word, marca profesional y trabajo en equipo cuando lo necesites.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-5 py-3 text-sm">
                {user ? "Crear documento" : "Empezar gratis"}
              </Link>
              <Link href="#comparativa" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Comparar planes
              </Link>
            </div>
            {planLabel && (
              <p className="mt-5 inline-flex rounded-full border border-[#d8f3dc] bg-white/70 px-4 py-2 text-sm font-semibold text-[#2d6a4f]">
                Tu plan actual es {planLabel}
              </p>
            )}
          </div>

          <div className="surface relative overflow-hidden rounded-md p-6">
            <p className="text-sm font-bold text-[#2d6a4f]">Por que Pro se paga solo</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Menos copiar, pegar y reformatear.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { value: documentTypes.length.toString(), label: "tipos de documento" },
                { value: "3", label: "gratis al mes" },
                { value: "Word", label: "incluido en Pro" },
                { value: "39 EUR", label: "Empresa al mes" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/78 p-4">
                  <p className="font-serif-display text-3xl font-bold text-[#2d6a4f]">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-md bg-[#d8f3dc]/60 p-4 text-sm leading-6">
              Free es perfecto para probar. Pro esta pensado para uso recurrente. Empresa suma workspaces, roles,
              auditoria y colaboracion interna.
            </div>
          </div>
        </div>
      </div>

      <div className="container-page pb-10">
        <PricingCards compact currentPlan={profile?.plan} />
      </div>

      <div id="comparativa" className="border-y border-[#d8f3dc] bg-white/46 py-12 scroll-mt-24">
        <div className="container-page">
          <div className="mb-6 max-w-2xl">
            <p className="eyebrow">Comparativa</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Lo importante, sin rodeos</h2>
          </div>
          <div className="overflow-x-auto rounded-md border border-[#d8f3dc] bg-white/80">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] border-b border-[#d8f3dc] bg-[#faf9f6] text-sm font-bold">
                <div className="p-4">Caracteristica</div>
                <div className="p-4">Free</div>
                <div className="p-4 text-[#2d6a4f]">Pro</div>
                <div className="p-4 text-[#2d6a4f]">Empresa</div>
              </div>
              {comparisonRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] border-b border-[#d8f3dc] text-sm last:border-0"
                >
                  <div className="p-4 font-semibold">{row.label}</div>
                  <div className="p-4 text-slate-600">{row.free}</div>
                  <div className="p-4 font-semibold text-[#2d6a4f]">{row.pro}</div>
                  <div className="p-4 font-semibold text-[#2d6a4f]">{row.empresa}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-page py-12">
        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="eyebrow">Catalogo Pro</p>
            <h2 className="font-serif-display mt-3 text-4xl font-bold">Documentos que desbloqueas al crecer</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Pro anade los documentos que suelen ahorrar mas tiempo: laborales, inmobiliarios, digitales y acuerdos con
              mas detalle.
            </p>
            <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary mt-6 px-5 py-3 text-sm">
              {user ? "Ver catalogo completo" : "Probar DocuGen"}
            </Link>
          </div>

          <div className="grid gap-4">
            {Object.entries(groupedProDocuments).map(([category, docs]) => (
              <div key={category} className="surface-flat rounded-md p-4">
                <h3 className="font-bold text-[#2d6a4f]">{category}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {docs.map((doc) => (
                    <span key={doc.type} className="rounded-full border border-[#d8f3dc] bg-white/70 px-3 py-1 text-xs font-semibold">
                      {doc.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="surface-flat rounded-md p-5">
              <h3 className="font-bold">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page pb-12">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
