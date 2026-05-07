import Link from "next/link";
import { documentTypes } from "@/lib/document-types";

export function DocumentGallery() {
  return (
    <section className="container-page py-16">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Documentos</p>
        <h2 className="font-serif-display mt-3 text-4xl font-bold">Una galería pensada para trabajo real</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {documentTypes.map((doc) => (
          <Link key={doc.type} href={`/${doc.type}`} className="surface-flat interactive rounded-md p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2d6a4f]">{doc.category}</p>
            <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{doc.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
