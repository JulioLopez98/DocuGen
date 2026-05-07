import { Suspense } from "react";
import { GeneratorClient } from "@/components/GeneratorClient";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { getDocumentConfig, type DocumentType } from "@/lib/document-types";
import { getCurrentProfile, type DocumentRow } from "@/lib/supabase-server";

type Props = {
  searchParams?: {
    templateId?: string;
  };
};

export default async function GeneratePage({ searchParams }: Props) {
  const templateId = searchParams?.templateId;
  let initialDocType: DocumentType | undefined;
  let initialFormData: Record<string, string> | undefined;

  if (templateId) {
    const { supabase, profile } = await getCurrentProfile();

    if (supabase && profile) {
      const { data: template } = await supabase.from("documents").select("*").eq("id", templateId).single<DocumentRow>();
      const config = getDocumentConfig(template?.doc_type);

      if (template && config) {
        initialDocType = config.type;
        initialFormData = template.form_data;
      }
    }
  }

  return (
    <section className="container-page py-10">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Generador</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">Crea un borrador profesional</h1>
        <p className="mt-3 text-slate-600">Completa el formulario y revisa el documento antes de usarlo.</p>
      </div>
      <Suspense>
        <GeneratorClient initialDocType={initialDocType} initialFormData={initialFormData} />
      </Suspense>
      <div className="mt-8">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
