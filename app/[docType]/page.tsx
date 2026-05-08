import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { documentTypes, getDocumentConfig, requiresPro, type DocumentTypeConfig } from "@/lib/document-types";

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
    alternates: {
      canonical: `/${config.type}`,
    },
    openGraph: {
      title: `${config.seoTitle} | DocuGen`,
      description: config.seoDescription,
      url: `/${config.type}`,
      type: "website",
    },
    keywords: [config.label, config.category, "generador documentos IA", "documentos profesionales Espana", "borradores IA"],
  };
}

export default function DocumentSeoPage({ params }: Props) {
  const config = getDocumentConfig(params.docType);

  if (!config) {
    notFound();
  }

  const relatedDocuments = getRelatedDocuments(config);
  const pro = requiresPro(config);
  const faqs = getDocumentFaqs(config);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `DocuGen - ${config.label}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${config.type}`,
        description: config.seoDescription,
        offers: { "@type": "Offer", price: pro ? "9" : "0", priceCurrency: "EUR" },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
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
            <Link href="/catalogo" className="focus-ring btn-secondary px-6 py-3 text-sm">
              Ver catalogo
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
            <InfoLine title="Plan" text={pro ? "Documento Pro" : "Incluido en Free"} />
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

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">Contenido</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Que datos necesitas para generarlo</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El formulario esta adaptado a este documento para evitar campos genericos y acelerar el primer borrador.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.name} className="surface-flat rounded-md p-4">
              <h3 className="text-sm font-bold">{field.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Campo {getFieldDescription(field)} usado para personalizar el borrador.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 max-w-2xl">
          <p className="eyebrow">Preguntas frecuentes</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Antes de crear este documento</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <article key={faq.question} className="surface-flat rounded-md p-5">
              <h3 className="font-bold">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      {relatedDocuments.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Relacionados</p>
              <h2 className="font-serif-display mt-3 text-4xl font-bold">Otros documentos de {config.category}</h2>
            </div>
            <Link href="/catalogo" className="focus-ring btn-secondary px-4 py-2 text-sm">
              Ver todos
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedDocuments.map((doc) => (
              <Link key={doc.type} href={`/${doc.type}`} className="surface-flat interactive rounded-md p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{doc.label}</h3>
                  {requiresPro(doc) && (
                    <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold text-white">Pro</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <LegalDisclaimer />
      </div>
    </section>
  );
}

function getRelatedDocuments(config: DocumentTypeConfig) {
  return documentTypes.filter((doc) => doc.category === config.category && doc.type !== config.type).slice(0, 3);
}

function getDocumentFaqs(config: DocumentTypeConfig) {
  const access = requiresPro(config)
    ? "Este documento forma parte del plan Pro por su complejidad o uso profesional avanzado."
    : "Este documento esta incluido en el plan Free, dentro del limite mensual gratuito.";

  return [
    {
      question: `Para que sirve ${config.label.toLowerCase()}?`,
      answer: config.summary,
    },
    {
      question: "Que plan necesito?",
      answer: access,
    },
    {
      question: "El resultado es definitivo?",
      answer:
        "No. DocuGen genera un borrador con IA. Debe revisarse y adaptarse por un profesional cuando vaya a utilizarse con efectos legales, laborales o comerciales relevantes.",
    },
    {
      question: "Puedo exportarlo?",
      answer: "Si. Puedes descargar PDF y TXT. La exportacion Word esta disponible para usuarios Pro.",
    },
  ];
}

function InfoLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-3">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function getFieldDescription(field: DocumentTypeConfig["fields"][number]) {
  if (!("type" in field) || !field.type) {
    return "de texto";
  }

  if (field.type === "textarea") {
    return "de texto amplio";
  }

  if (field.type === "email") {
    return "de email";
  }

  if (field.type === "date") {
    return "de fecha";
  }

  if (field.type === "number") {
    return "numerico";
  }

  return "de texto";
}
