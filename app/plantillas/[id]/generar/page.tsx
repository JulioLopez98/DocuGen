import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TemplateDirectGenerator } from "@/components/TemplateDirectGenerator";
import { getCurrentProfile, type BrandSettings, type DocumentTemplateRow } from "@/lib/supabase-server";
import { readTemplateVariables } from "@/lib/template-variables";

type Props = {
  params: {
    id: string;
  };
};

export const metadata: Metadata = {
  title: "Generar desde plantilla",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GenerateFromTemplatePage({ params }: Props) {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  if (profile.plan === "free") {
    redirect("/precios");
  }

  const { data: template } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", params.id)
    .single<DocumentTemplateRow>();

  if (!template) {
    notFound();
  }

  const { data: brandSettings } = await supabase
    .from("brand_settings")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle<BrandSettings>();

  if (template.status !== "ready" || !template.extracted_text) {
    return (
      <section className="container-page py-8 lg:py-10">
        <Link href={`/plantillas/${template.id}`} className="text-sm font-semibold text-[#2d6a4f] transition hover:text-[#1f2933]">
          Volver a plantilla
        </Link>
        <div className="surface mt-6 p-8">
          <p className="eyebrow">Pendiente</p>
          <h1 className="section-title mt-3">Procesa la plantilla primero</h1>
          <p className="body-muted mt-3 max-w-2xl">
            Para generar desde una plantilla concreta necesitamos texto extraído y variables revisables.
          </p>
          <Link href={`/plantillas/${template.id}`} className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm">
            Abrir ficha de plantilla
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-8 lg:py-10">
      <Link href={`/plantillas/${template.id}`} className="text-sm font-semibold text-[#2d6a4f] transition hover:text-[#1f2933]">
        Volver a plantilla
      </Link>
      <div className="surface-muted mt-5 p-5">
        <p className="eyebrow">Generación guiada</p>
        <h1 className="panel-title mt-3">Nuevo documento desde “{template.name}”</h1>
        <p className="body-muted mt-3 max-w-3xl">
          Esta opción usa la plantilla como modelo principal. Rellena los campos detectados, añade indicaciones si hace
          falta y DocuGen generará un documento nuevo sin copiar datos concretos del archivo original.
        </p>
      </div>
      <div className="mt-6">
        <TemplateDirectGenerator
          templateId={template.id}
          templateName={template.name}
          templateCategory={template.category}
          templateSummary={template.summary}
          variables={readTemplateVariables(template.extracted_metadata)}
          canExportDocx
          brandSettings={brandSettings}
        />
      </div>
      {brandSettings?.logo_url && (
        <p className="mt-4 text-xs text-slate-500">
          Tu marca configurada se aplicará en exportaciones cuando corresponda.
        </p>
      )}
    </section>
  );
}
