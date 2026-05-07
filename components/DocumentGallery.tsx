import Link from "next/link";
import { documentTypes } from "@/lib/document-types";

export function DocumentGallery() {
  return (
    <section className="container-page py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Documentos</p>
          <h2 className="font-serif-display mt-3 text-4xl font-bold">Una galeria pensada para trabajo real</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Cada tipo tiene su propio formulario, validacion y prompt para generar borradores mas coherentes.
          </p>
        </div>
        <Link href="/generar" className="focus-ring btn-secondary px-4 py-3 text-sm">
          Abrir generador
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {documentTypes.map((doc) => (
          <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive rounded-md p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6a4f]">{doc.category}</p>
            <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
            <span className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">Crear este documento</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
