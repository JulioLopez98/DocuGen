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
      <section className="container-page py-10">
        <Link href={`/plantillas/${template.id}`} className="text-sm font-semibold text-[#2d6a4f]">
          Volver a plantilla
        </Link>
        <div className="surface mt-6 rounded-md p-8">
          <p className="eyebrow">Pendiente</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Procesa la plantilla primero</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Para generar desde una plantilla concreta necesitamos texto extraido y variables revisables.
          </p>
          <Link href={`/plantillas/${template.id}`} className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm">
            Abrir ficha de plantilla
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page py-10">
      <Link href={`/plantillas/${template.id}`} className="text-sm font-semibold text-[#2d6a4f]">
        Volver a plantilla
      </Link>
      <div className="mt-5">
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
          Tu marca configurada se aplicara en exportaciones cuando corresponda.
        </p>
      )}
    </section>
  );
}
