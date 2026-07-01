import type { Metadata } from "next";
import Link from "next/link";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { PricingCards } from "@/components/PricingCards";
import { documentTypes, requiresPro } from "@/lib/document-types";
import { createSupabaseServerClient, type Profile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Precios de DocuGen",
  description:
    "Compara DocuGen Free, Pro y Empresa. Empieza gratis y desbloquea documentos ilimitados, Word, marca personalizada y equipo.",
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
  { label: "Tipos disponibles", free: "Esenciales", pro: "Catálogo completo", empresa: "Catálogo + equipo" },
  { label: "Exportación", free: "PDF y TXT", pro: "PDF, TXT y Word", empresa: "PDF, TXT y Word" },
  { label: "Marca personalizada", free: "No incluida", pro: "Logo y datos", empresa: "Marca compartida" },
  { label: "Documentos a medida", free: "No incluido", pro: "Incluido", empresa: "Incluido" },
  { label: "Plantillas propias", free: "No incluido", pro: "Biblioteca personal", empresa: "Biblioteca de equipo" },
  { label: "Equipo y roles", free: "No incluido", pro: "Personal", empresa: "Admin, editor y lectura" },
  { label: "Auditoría y avisos", free: "No incluido", pro: "Personal", empresa: "Actividad de equipo" },
];

const personaBlocks = [
  {
    title: "Autónomos y freelance",
    text: "Presupuestos, propuestas, contratos de servicios y cartas profesionales sin empezar desde cero.",
  },
  {
    title: "Agencias y consultoras",
    text: "Documentos recurrentes, Word, marca y plantillas propias para mantener una forma de trabajar consistente.",
  },
  {
    title: "Equipos y empresas",
    text: "Espacios compartidos, roles, documentos de equipo y una biblioteca documental preparada para crecer.",
  },
];

const faqs = [
  {
    question: "¿DocuGen sustituye a un asesor legal?",
    answer:
      "No. DocuGen genera borradores profesionales con IA. Los documentos deben revisarse por un profesional cuando vayan a usarse con efectos legales o laborales relevantes.",
  },
  {
    question: "¿Puedo cancelar Pro cuando quiera?",
    answer:
      "Sí. Puedes cambiar de plan o cancelar desde tu cuenta. Si cancelas, mantienes el acceso hasta que termine el mes ya pagado y después DocuGen vuelve a Free automáticamente. No se devuelve el importe del periodo ya pagado.",
  },
  {
    question: "¿Qué pasa si sigo en Free?",
    answer:
      "Puedes crear hasta 3 documentos al mes, descargar PDF/TXT y guardar documentos básicos. Los documentos avanzados, Word, plantillas y a medida quedan para Pro.",
  },
  {
    question: "¿Word está incluido en Pro?",
    answer:
      "Sí. El plan Pro permite descargar documentos en Word y aplicar marca personalizada cuando la tengas configurada.",
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
  const empresaCheckoutEnabled = Boolean(process.env.STRIPE_PRICE_ID_EMPRESA);

  return (
    <section>
      <div className="container-page py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <p className="eyebrow">Precios</p>
            <h1 className="section-title mt-3 max-w-4xl">
              Empieza gratis. Pasa a Pro cuando DocuGen ya te esté ahorrando tiempo.
            </h1>
            <p className="body-muted mt-5 max-w-2xl text-base">
              Free sirve para probar el flujo completo. Pro desbloquea documentos ilimitados, Word, marca, plantillas y
              generación a medida. Empresa añade colaboración y control para equipos.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-5 py-3 text-sm">
                {user ? "Crear documento" : "Empezar gratis"}
              </Link>
              <Link href="#planes" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Ver planes
              </Link>
              <Link href="#comparativa" className="focus-ring btn-ghost px-5 py-3 text-sm">
                Comparar todo
              </Link>
            </div>
            {planLabel && <p className="status-success mt-5 inline-flex">Tu plan actual es {planLabel}</p>}
          </div>

          <div className="surface relative overflow-hidden p-6">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-[#d8f3dc]/60" aria-hidden="true" />
            <div className="relative">
              <p className="eyebrow">Por qué Pro tiene sentido</p>
              <h2 className="panel-title mt-3">Menos copiar, pegar y reformatear.</h2>
              <p className="body-muted mt-3">
                El valor está en convertir documentos repetitivos en un flujo guiado, exportable y reutilizable.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { value: documentTypes.length.toString(), label: "tipos disponibles" },
                  { value: "3", label: "documentos gratis" },
                  { value: "Word", label: "incluido en Pro" },
                  { value: "0", label: "permanencia" },
                ].map((stat) => (
                  <div key={stat.label} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-[#faf9f6]/78 p-4">
                    <p className="font-serif-display text-3xl font-bold text-[#2d6a4f]">{stat.value}</p>
                    <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="status-note mt-5">
                Todos los documentos siguen siendo borradores generados con IA y deben revisarse antes de usarse con efectos legales.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="planes" className="container-page scroll-mt-24 pb-10">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {[
            ["Free", "Para probar", "3 documentos al mes y exportación PDF/TXT."],
            ["Pro", "Para uso frecuente", "Documentos ilimitados, Word, marca, plantillas y a medida."],
            ["Empresa", "Para equipos", "Workspace, roles, plantillas compartidas y actividad."],
          ].map(([plan, title, text]) => (
            <div key={plan} className="surface-flat p-4">
              <p className="eyebrow">{plan}</p>
              <h2 className="mt-2 text-base font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <PricingCards compact currentPlan={profile?.plan} empresaCheckoutEnabled={empresaCheckoutEnabled} />
      </div>

      <div className="border-y border-[#d8f3dc] bg-[#f2efe8]/56 py-12">
        <div className="container-page">
          <div className="mb-6 max-w-2xl">
            <p className="eyebrow">Para quién</p>
            <h2 className="panel-title mt-3">Un plan para cada forma de trabajar</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {personaBlocks.map((block) => (
              <article key={block.title} className="surface-flat interactive p-5">
                <h3 className="text-lg font-bold">{block.title}</h3>
                <p className="body-muted mt-3">{block.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div id="comparativa" className="container-page scroll-mt-24 py-12">
        <div className="mb-6 max-w-2xl">
          <p className="eyebrow">Comparativa</p>
          <h2 className="panel-title mt-3">Lo importante, sin rodeos</h2>
          <p className="body-muted mt-3">Free prueba el producto. Pro es el uso recurrente. Empresa es colaboración, roles y control.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-[#d8f3dc] bg-[#fffdf8]/84 shadow-[0_16px_42px_rgba(31,41,51,0.06)]">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] border-b border-[#d8f3dc] bg-[#faf9f6] text-sm font-bold">
              <div className="p-4">Característica</div>
              <div className="p-4">Free</div>
              <div className="bg-[#d8f3dc]/44 p-4 text-[#2d6a4f]">Pro</div>
              <div className="p-4 text-[#2d6a4f]">Empresa</div>
            </div>
            {comparisonRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[1.1fr_0.8fr_0.9fr_1fr] border-b border-[#d8f3dc] text-sm last:border-0"
              >
                <div className="p-4 font-semibold">{row.label}</div>
                <div className="p-4 text-slate-600">{row.free}</div>
                <div className="bg-[#d8f3dc]/22 p-4 font-semibold text-[#2d6a4f]">{row.pro}</div>
                <div className="p-4 font-semibold text-[#2d6a4f]">{row.empresa}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page pb-12">
        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="eyebrow">Tipos Pro</p>
            <h2 className="panel-title mt-3">Documentos que desbloqueas al crecer</h2>
            <p className="body-muted mt-4">
              Pro añade los documentos que suelen ahorrar más tiempo: laborales, inmobiliarios, digitales y acuerdos con
              más detalle.
            </p>
            <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary mt-6 px-5 py-3 text-sm">
              {user ? "Ver tipos completos" : "Probar DocuGen"}
            </Link>
          </div>

          <div className="grid gap-4">
            {Object.entries(groupedProDocuments).map(([category, docs]) => (
              <div key={category} className="surface-flat p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-[#2d6a4f]">{category}</h3>
                  <span className="badge badge-free">{docs.length} tipos</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {docs.map((doc) => (
                    <span key={doc.type} className="badge bg-[#fffdf8]/72 text-slate-600">
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
        <div className="mb-6 max-w-2xl">
          <p className="eyebrow">Dudas frecuentes</p>
          <h2 className="panel-title mt-3">Antes de actualizar</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question} className="surface-flat p-5">
              <h3 className="font-bold">{faq.question}</h3>
              <p className="body-muted mt-2">{faq.answer}</p>
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
