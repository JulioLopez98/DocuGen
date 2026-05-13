import { documentTypes, type DocumentTypeConfig } from "@/lib/document-types";

export type CatalogCategory = {
  name: string;
  slug: string;
  title: string;
  description: string;
};

export const catalogCategories = [
  {
    name: "Laboral y servicios",
    slug: "laboral-servicios",
    title: "Documentos laborales y de servicios",
    description: "Contratos y acuerdos para freelancers, clientes y prestacion de servicios profesionales en Espana.",
  },
  {
    name: "Comercial",
    slug: "comercial",
    title: "Documentos comerciales",
    description: "Presupuestos, propuestas, ordenes de compra y documentos para vender o comprar con mas claridad.",
  },
  {
    name: "Legal",
    slug: "legal",
    title: "Borradores legales",
    description: "Acuerdos, NDAs, cesiones y documentos que conviene revisar profesionalmente antes de usar.",
  },
  {
    name: "Web",
    slug: "web",
    title: "Documentos web y ecommerce",
    description: "Aviso legal, privacidad, cookies, envios, devoluciones y textos de cumplimiento para negocios online.",
  },
  {
    name: "Profesional",
    slug: "profesional",
    title: "Documentos profesionales",
    description: "Cartas, actas, certificados y comunicaciones formales para el dia a dia profesional.",
  },
  {
    name: "Empresa",
    slug: "empresa",
    title: "Documentos para empresa",
    description: "Acuerdos internos, colaboraciones, socios y respuestas formales para pequenas empresas.",
  },
  {
    name: "Laboral",
    slug: "laboral",
    title: "Documentos laborales",
    description: "Contratos, acuerdos de teletrabajo y comunicaciones laborales preparadas como borradores revisables.",
  },
  {
    name: "Digital",
    slug: "digital",
    title: "Contratos digitales",
    description: "Contratos de desarrollo web, mantenimiento y servicios digitales con alcance, hitos y entregables.",
  },
  {
    name: "Inmobiliario",
    slug: "inmobiliario",
    title: "Documentos inmobiliarios",
    description: "Contratos de arras e inventarios de inmueble para operaciones y entregas inmobiliarias.",
  },
] as const satisfies readonly CatalogCategory[];

export function getCatalogCategoryBySlug(slug: string | null | undefined) {
  return catalogCategories.find((category) => category.slug === slug);
}

export function getCatalogCategoryByName(name: string | null | undefined) {
  return catalogCategories.find((category) => category.name === name);
}

export function getDocumentsByCategory(categoryName: string) {
  return documentTypes.filter((doc) => doc.category === categoryName);
}

export function groupDocumentsByCategory(items: readonly DocumentTypeConfig[]) {
  return items.reduce<Record<string, DocumentTypeConfig[]>>((groups, item) => {
    groups[item.category] = [...(groups[item.category] || []), item];
    return groups;
  }, {});
}
