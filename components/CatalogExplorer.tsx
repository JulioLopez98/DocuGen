"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { catalogCategories, getCatalogCategoryByName, groupDocumentsByCategory } from "@/lib/catalog";
import { documentTypes, requiresPro } from "@/lib/document-types";

type CatalogExplorerProps = {
  signedIn?: boolean;
  initialCategory?: string;
};

export function CatalogExplorer({ signedIn = false, initialCategory = "Todos" }: CatalogExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return documentTypes.filter((doc) => {
      const matchesCategory = category === "Todos" || doc.category === category;
      const searchable = `${doc.label} ${doc.summary} ${doc.category} ${doc.seoDescription}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const groupedDocuments = useMemo(() => groupDocumentsByCategory(filteredDocuments), [filteredDocuments]);

  return (
    <section className="space-y-6">
      <div className="surface rounded-md p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar tipos de documento</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-[#fffdf8]/92 px-4 py-3 text-sm transition focus:border-[#2d6a4f]"
              placeholder="Contrato, privacidad, teletrabajo, reclamación..."
            />
          </label>
          <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
            <CategoryLink active={category === "Todos"} href="/catalogo" label="Todos" />
            {catalogCategories.map((item) => (
              <CategoryLink
                key={item.slug}
                active={category === item.name}
                href={`/catalogo/${item.slug}`}
                label={item.name}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {filteredDocuments.length} documentos encontrados
          {category !== "Todos" ? ` en ${getCatalogCategoryByName(category)?.title || category}` : ""}
        </p>
        <Link href="/precios" className="focus-ring btn-secondary px-4 py-2 text-sm">
          Comparar Free y Pro
        </Link>
      </div>

      {Object.entries(groupedDocuments).map(([groupName, docs]) => (
        <section key={groupName} className="scroll-mt-24">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-serif-display text-3xl font-bold">{groupName}</h2>
            <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{docs.length}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {docs.map((doc) => {
              const pro = requiresPro(doc);

              return (
                <article key={doc.type} className="surface-flat interactive flex h-full flex-col rounded-md p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        pro ? "bg-[#2d6a4f] text-white" : "bg-[#d8f3dc] text-[#2d6a4f]"
                      }`}
                    >
                      {pro ? "Pro" : "Free"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{doc.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/${doc.type}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                      Ver ficha
                    </Link>
                    <Link
                      href={signedIn ? `/generar?type=${doc.type}` : "/auth"}
                      className="focus-ring btn-primary px-3 py-2 text-xs"
                    >
                      Crear
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {filteredDocuments.length === 0 && (
        <EmptyState
          eyebrow="Sin coincidencias"
          title="No encontramos documentos con esa búsqueda"
          description="Prueba con una palabra más general como contrato, web, reclamación o presupuesto. También puedes volver a todos los tipos."
          primaryAction={{ href: "/catalogo", label: "Ver todos los tipos" }}
          secondaryAction={{ href: signedIn ? "/generar" : "/auth", label: signedIn ? "Abrir generador" : "Empezar gratis" }}
        />
      )}
    </section>
  );
}

function CategoryLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`focus-ring rounded-full border px-3 py-2 text-xs font-bold transition ${
        active ? "border-[#2d6a4f] bg-[#2d6a4f] text-white" : "border-[#d8f3dc] bg-[#fffdf8]/74 text-[#2d6a4f] hover:border-[#2d6a4f]"
      }`}
    >
      {label}
    </Link>
  );
}
