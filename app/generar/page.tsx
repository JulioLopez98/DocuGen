import { Suspense } from "react";
import { GeneratorClient } from "@/components/GeneratorClient";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { getDocumentConfig, type DocumentType } from "@/lib/document-types";
import { getCurrentProfile, type BrandSettings, type DocumentRow } from "@/lib/supabase-server";

type Props = {
  searchParams?: {
    templateId?: string;
    type?: string;
  };
};

export default async function GeneratePage({ searchParams }: Props) {
  const templateId = searchParams?.templateId;
  const { supabase, profile } = await getCurrentProfile();
  let initialDocType: DocumentType | undefined;
  let initialFormData: Record<string, string> | undefined;

  if (templateId) {
    if (supabase && profile) {
      const { data: template } = await supabase.from("documents").select("*").eq("id", templateId).single<DocumentRow>();
      const config = getDocumentConfig(template?.doc_type);

      if (template && config) {
        initialDocType = config.type;
        initialFormData = template.form_data;
      }
    }
  }
  const { data: brandSettings } =
    supabase && profile && profile.plan !== "free"
      ? await supabase.from("brand_settings").select("*").eq("user_id", profile.id).maybeSingle<BrandSettings>()
      : { data: null };

  return (
    <section className="container-page py-10">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow">Generador</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Crea un borrador profesional</h1>
          <p className="mt-3 text-slate-600">
            Elige el documento, completa los campos y revisa el resultado antes de exportarlo o usarlo.
          </p>
        </div>
        <div className="surface-flat rounded-md p-4 text-sm">
          <p className="font-semibold text-[#2d6a4f]">Exportaciones</p>
          <p className="mt-1 text-slate-600">{profile?.plan !== "free" ? "PDF, TXT y Word disponibles" : "PDF y TXT incluidos. Word con Pro"}</p>
        </div>
      </div>
      <Suspense>
        <GeneratorClient
          initialDocType={initialDocType}
          initialFormData={initialFormData}
          canExportDocx={profile?.plan !== "free"}
          brandSettings={brandSettings || null}
        />
      </Suspense>
      <div className="mt-8">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
