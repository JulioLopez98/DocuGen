import Link from "next/link";
import { documentTypes, requiresPro, type DocumentType } from "@/lib/document-types";

const featuredTypes: DocumentType[] = [
  "contrato-freelance",
  "presupuesto-comercial",
  "propuesta-proyecto",
  "aviso-legal",
  "politica-privacidad",
  "carta-presentacion",
];

export function DocumentGallery() {
  const featuredDocuments = documentTypes.filter((doc) => featuredTypes.includes(doc.type));

  return (
    <section className="container-page py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Ejemplos populares</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Algunos documentos que puedes crear hoy</h2>
          <p className="body-muted mt-3">
            Esta es solo una muestra. El catálogo completo incluye {documentTypes.length} tipos organizados por objetivo y categoría para no saturar el generador.
          </p>
        </div>
        <Link href="/catalogo" className="focus-ring btn-secondary px-4 py-3 text-sm">
          Ver catálogo completo
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featuredDocuments.map((doc) => (
          <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6a4f]">{doc.category}</p>
              <span className={requiresPro(doc) ? "badge badge-pro" : "badge badge-free"}>{requiresPro(doc) ? "Pro" : "Free"}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
            <span className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">Crear este documento</span>
          </Link>
        ))}
      </div>
    </section>
  );
}