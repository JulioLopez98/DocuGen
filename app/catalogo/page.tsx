import type { Metadata } from "next";
import Link from "next/link";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { catalogCategories } from "@/lib/catalog";
import { documentTypes, requiresPro } from "@/lib/document-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Catalogo de documentos profesionales con IA",
  description:
    "Explora el catalogo de documentos de DocuGen: contratos, presupuestos, propuestas, documentos web, laborales, legales, comerciales e inmobiliarios para Espana.",
  alternates: {
    canonical: "/catalogo",
  },
  openGraph: {
    title: "Catalogo de documentos profesionales con IA | DocuGen",
    description:
      "Todos los tipos de documentos disponibles en DocuGen, organizados por categoria y preparados para generar borradores con IA.",
    url: "/catalogo",
    type: "website",
  },
};

export default async function CatalogPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const freeCount = documentTypes.filter((doc) => !requiresPro(doc)).length;
  const proCount = documentTypes.length - freeCount;
  const categories = catalogCategories;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Catalogo de documentos DocuGen",
    description: metadata.description,
    url: `${baseUrl}/catalogo`,
    hasPart: [
      ...categories.map((category) => ({
        "@type": "CollectionPage",
        name: category.title,
        url: `${baseUrl}/catalogo/${category.slug}`,
        description: category.description,
      })),
      ...documentTypes.map((doc) => ({
        "@type": "WebPage",
        name: doc.label,
        url: `${baseUrl}/${doc.type}`,
        description: doc.seoDescription,
      })),
    ],
  };

  return (
    <section className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h1 className="font-serif-display mt-3 max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
            Todos los documentos que puedes crear con DocuGen
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">
            Explora plantillas para trabajo real: contratos, presupuestos, cartas, documentos web, acuerdos laborales,
            ecommerce e inmobiliario. Cada ficha explica para que sirve y permite saltar al generador.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={user ? "/generar" : "/auth"} className="focus-ring btn-primary px-5 py-3 text-sm">
              {user ? "Abrir generador" : "Empezar gratis"}
            </Link>
            <Link href="/precios" className="focus-ring btn-secondary px-5 py-3 text-sm">
              Ver planes
            </Link>
          </div>
        </div>

        <aside className="surface rounded-md p-5">
          <p className="text-sm font-bold text-[#2d6a4f]">Resumen del catalogo</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat value={documentTypes.length.toString()} label="documentos" />
            <Stat value={categories.length.toString()} label="categorias" />
            <Stat value={freeCount.toString()} label="incluidos Free" />
            <Stat value={proCount.toString()} label="solo Pro" />
          </div>
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Categorias SEO</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Explora por familia de documentos</h2>
          </div>
          <Link href="/precios" className="focus-ring btn-secondary px-4 py-2 text-sm">
            Ver planes
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.slug} href={`/catalogo/${category.slug}`} className="surface-flat interactive rounded-md p-4">
              <h3 className="font-bold text-[#2d6a4f]">{category.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <CatalogExplorer signedIn={Boolean(user)} />
      </div>

      <div className="mt-12">
        <LegalDisclaimer />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/78 p-4">
      <p className="font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>
  );
}
