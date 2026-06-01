import Link from "next/link";
import { documentTypes, requiresPro, type DocumentType } from "@/lib/document-types";

const featuredTypes: DocumentType[] = [
  "contrato-freelance",
  "presupuesto-comercial",
  "propuesta-proyecto",
  "aviso-legal",
  "politica-privacidad",
  "carta-presentacion",
  "factura-proforma",
  "acta-reunion",
];

export function DocumentGallery() {
  const featuredDocuments = documentTypes.filter((doc) => featuredTypes.includes(doc.type));

  return (
    <section className="container-page py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Documentos</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Una galería pensada para trabajo real</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Una selección de documentos habituales. El generador completo incluye {documentTypes.length} tipos organizados por categoría.
          </p>
        </div>
        <Link href="/catalogo" className="focus-ring btn-secondary px-4 py-3 text-sm">
          Ver tipos de documento
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuredDocuments.map((doc) => (
          <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive rounded-md p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6a4f]">{doc.category}</p>
              {requiresPro(doc) && (
                <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold text-white">Pro</span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
            <span className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">Crear este documento</span>
          </Link>
        ))}
      </div>
      <div className="mt-8 rounded-md border border-[#d8f3dc] bg-white/64 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm leading-6 text-slate-600">
            Hay más documentos laborales, legales, ecommerce, digitales e inmobiliarios dentro del generador.
          </p>
          <Link href="/catalogo" className="focus-ring btn-primary px-5 py-3 text-sm">
            Ver tipos de documento
          </Link>
        </div>
      </div>
    </section>
  );
}
