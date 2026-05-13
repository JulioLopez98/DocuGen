import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { catalogCategories, getCatalogCategoryBySlug, getDocumentsByCategory } from "@/lib/catalog";
import { requiresPro } from "@/lib/document-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Props = {
  params: {
    category: string;
  };
};

export function generateStaticParams() {
  return catalogCategories.map((category) => ({ category: category.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const category = getCatalogCategoryBySlug(params.category);

  if (!category) {
    return {};
  }

  return {
    title: `${category.title} con IA`,
    description: `${category.description} Explora plantillas de DocuGen y genera borradores profesionales adaptados a Espana.`,
    alternates: {
      canonical: `/catalogo/${category.slug}`,
    },
    openGraph: {
      title: `${category.title} con IA | DocuGen`,
      description: category.description,
      url: `/catalogo/${category.slug}`,
      type: "website",
    },
    keywords: [
      category.title,
      "generador documentos IA",
      "documentos profesionales Espana",
      "borradores profesionales",
      "plantillas documentos",
    ],
  };
}

export default async function CatalogCategoryPage({ params }: Props) {
  const category = getCatalogCategoryBySlug(params.category);

  if (!category) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const docs = getDocumentsByCategory(category.name);
  const freeCount = docs.filter((doc) => !requiresPro(doc)).length;
  const proCount = docs.length - freeCount;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.title} - DocuGen`,
    description: category.description,
    url: `${baseUrl}/catalogo/${category.slug}`,
    isPartOf: {
      "@type": "CollectionPage",
      name: "Catalogo de documentos DocuGen",
      url: `${baseUrl}/catalogo`,
    },
    hasPart: docs.map((doc) => ({
      "@type": "WebPage",
      name: doc.label,
      url: `${baseUrl}/${doc.type}`,
      description: doc.seoDescription,
    })),
  };

  return (
    <section className="container-page py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="mb-8">
        <Link href="/catalogo" className="focus-ring btn-ghost px-0 py-2 text-sm">
          Volver al catalogo
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
        <div>
          <p className="eyebrow">Catalogo / {category.name}</p>
          <h1 className="font-serif-display mt-3 max-w-4xl text-5xl font-bold leading-tight md:text-6xl">
            {category.title} generados con IA
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">
            {category.description} Cada documento se crea como borrador editable y mantiene avisos de revision cuando
            corresponde.
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
          <p className="text-sm font-bold text-[#2d6a4f]">Resumen de categoria</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat value={docs.length.toString()} label="documentos" />
            <Stat value={freeCount.toString()} label="incluidos Free" />
            <Stat value={proCount.toString()} label="solo Pro" />
            <Stat value="PDF" label="TXT y Word Pro" />
          </div>
        </aside>
      </div>

      <div className="mt-10">
        <CatalogExplorer signedIn={Boolean(user)} initialCategory={category.name} />
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
