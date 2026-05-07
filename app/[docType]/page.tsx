import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { documentTypes, getDocumentConfig } from "@/lib/document-types";

type Props = {
  params: { docType: string };
};

export function generateStaticParams() {
  return documentTypes.map((doc) => ({ docType: doc.type }));
}

export function generateMetadata({ params }: Props): Metadata {
  const config = getDocumentConfig(params.docType);

  if (!config) {
    return {};
  }

  return {
    title: config.seoTitle,
    description: config.seoDescription,
  };
}

export default function DocumentSeoPage({ params }: Props) {
  const config = getDocumentConfig(params.docType);

  if (!config) {
    notFound();
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `DocuGen - ${config.label}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <section className="container-page py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div>
          <p className="eyebrow">{config.category}</p>
          <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight">{config.seoTitle}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">{config.seoDescription}</p>
          <p className="mt-4 leading-7 text-slate-700">
            DocuGen te guia con un formulario especifico para preparar un primer borrador claro, editable y adaptado al
            contexto espanol. El documento se genera con IA y siempre debe revisarse antes de usarlo con efectos legales
            o profesionales relevantes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/generar?type=${config.type}`} className="focus-ring btn-primary px-6 py-3 text-sm">
              Crear {config.label.toLowerCase()}
            </Link>
            <Link href="/generar" className="focus-ring btn-secondary px-6 py-3 text-sm">
              Ver todos los documentos
            </Link>
          </div>
        </div>

        <aside className="surface rounded-md p-6">
          <p className="text-sm font-bold text-[#2d6a4f]">Que prepara</p>
          <h2 className="font-serif-display mt-3 text-2xl font-bold">{config.label}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{config.summary}</p>
          <div className="mt-5 space-y-3 text-sm">
            <InfoLine title="Campos guiados" text={`${config.fields.length} datos principales`} />
            <InfoLine title="Exportacion" text="PDF, TXT y Word para Pro" />
            <InfoLine title="Revision" text="Aviso de uso responsable incluido" />
          </div>
        </aside>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          ["Formulario especifico", "Cada documento pide solo los datos necesarios para ese tipo de borrador."],
          ["Marcadores pendientes", "Si falta informacion, el texto mantiene referencias claras para completar despues."],
          ["Historial y reutilizacion", "Puedes guardar el resultado y regenerarlo usando los mismos datos."],
        ].map(([title, text]) => (
          <article key={title} className="surface-flat rounded-md p-5">
            <h3 className="font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <div className="mt-10">
        <LegalDisclaimer />
      </div>
    </section>
  );
}

function InfoLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-3">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}
