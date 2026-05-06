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
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">{config.category}</p>
        <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight">{config.seoTitle}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">{config.seoDescription}</p>
        <p className="mt-4 leading-7 text-slate-700">
          DocuGen te guía con campos estructurados para preparar un borrador claro y editable. El resultado se adapta
          al contexto español y se entrega con un aviso de revisión profesional cuando corresponda.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/generar?type=${config.type}`}
            className="focus-ring rounded-md bg-[#2d6a4f] px-6 py-3 text-sm font-semibold text-white"
          >
            Crear {config.label.toLowerCase()}
          </Link>
          <Link
            href="/auth"
            className="focus-ring rounded-md border border-[#2d6a4f] px-6 py-3 text-sm font-semibold text-[#2d6a4f]"
          >
            Registrarme gratis
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {config.fields.map((field) => (
          <div key={field.name} className="rounded-md border border-[#d8f3dc] bg-white p-4">
            <p className="text-sm font-semibold">{field.label}</p>
            <p className="mt-1 text-xs text-slate-500">Campo usado para personalizar el borrador.</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
