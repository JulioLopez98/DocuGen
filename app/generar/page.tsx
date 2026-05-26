import { Suspense } from "react";
import type { Metadata } from "next";
import { ContextualHelp } from "@/components/ContextualHelp";
import { GeneratorClient } from "@/components/GeneratorClient";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { getDocumentConfig, type DocumentType } from "@/lib/document-types";
import { buildTemplateUsageMetrics, type TemplateUsageMetricEvent } from "@/lib/template-metrics";
import { templateUsageModes, type TemplateUsageMode } from "@/lib/template-usage";
import {
  getCurrentProfile,
  type BrandSettings,
  type CommunityDocumentTypeRow,
  type DocumentRow,
  type DocumentTemplateRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Generador",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams?: {
    templateId?: string;
    referenceTemplateId?: string;
    templateUsageMode?: string;
    type?: string;
    mode?: string;
  };
};

export default async function GeneratePage({ searchParams }: Props) {
  const templateId = searchParams?.templateId;
  let requestedReferenceTemplateId = searchParams?.referenceTemplateId;
  let requestedTemplateUsageMode = getTemplateUsageMode(searchParams?.templateUsageMode);
  const initialMode =
    searchParams?.mode === "custom" || searchParams?.mode === "community" || searchParams?.mode === "catalog"
      ? searchParams.mode
      : undefined;
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
        requestedReferenceTemplateId = requestedReferenceTemplateId || template.reference_template_id || undefined;
        requestedTemplateUsageMode = requestedTemplateUsageMode || template.template_usage_mode || undefined;
      }
    }
  }
  const { data: brandSettings } =
    supabase && profile && profile.plan !== "free"
      ? await supabase.from("brand_settings").select("*").eq("user_id", profile.id).maybeSingle<BrandSettings>()
      : { data: null };
  const { data: referenceTemplates } =
    supabase && profile && profile.plan !== "free"
      ? await supabase
          .from("document_templates")
          .select("id,name,category,summary,created_at,is_favorite,workspace_id")
          .eq("status", "ready")
          .not("extracted_text", "is", null)
          .order("is_favorite", { ascending: false })
          .order("created_at", { ascending: false })
          .returns<Pick<DocumentTemplateRow, "id" | "name" | "category" | "summary" | "created_at" | "is_favorite" | "workspace_id">[]>()
      : { data: [] };
  const { data: templateUsageEvents } =
    supabase && profile && profile.plan !== "free"
      ? await supabase
          .from("documents")
          .select("reference_template_id, template_usage_mode, created_at")
          .eq("user_id", profile.id)
          .not("reference_template_id", "is", null)
          .returns<TemplateUsageMetricEvent[]>()
      : { data: [] };
  const referenceTemplateMetrics = buildTemplateUsageMetrics(templateUsageEvents || []);
  const { data: memberships } =
    supabase && profile && profile.plan === "empresa"
      ? await supabase
          .from("workspace_members")
          .select("*")
          .eq("user_id", profile.id)
          .returns<WorkspaceMemberRow[]>()
      : { data: [] as WorkspaceMemberRow[] };
  const workspaceIds = (memberships || []).map((membership) => membership.workspace_id);
  const { data: workspaces } =
    supabase && workspaceIds.length
      ? await supabase
          .from("workspaces")
          .select("*")
          .in("id", workspaceIds)
          .order("created_at", { ascending: true })
          .returns<WorkspaceRow[]>()
      : { data: [] as WorkspaceRow[] };
  const { data: communityTypes } =
    supabase && profile
      ? await supabase
          .from("community_document_types")
          .select("*")
          .in("status", ["approved", "published"])
          .order("created_at", { ascending: false })
          .returns<CommunityDocumentTypeRow[]>()
      : { data: [] };

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
      <div className="mb-6">
        <ContextualHelp
          title="Si no sabes por donde empezar"
          description="Piensa primero en la intencion: vender, contratar, reclamar, preparar una web o pedir algo a medida. DocuGen te mostrara opciones mas concretas en el panel izquierdo."
          items={[
            "Catalogo: mejor para documentos frecuentes con campos guiados.",
            "Tipos de la comunidad: documentos nuevos revisados a partir de solicitudes reales.",
            "A medida: para casos que no encajan en el catalogo, disponible en Pro.",
          ]}
          secondaryAction={{ href: "/catalogo", label: "Ver tipos de documento" }}
        />
      </div>
      <Suspense>
        <GeneratorClient
          initialDocType={initialDocType}
          initialFormData={initialFormData}
          canExportDocx={profile?.plan !== "free"}
          brandSettings={brandSettings || null}
          plan={profile?.plan}
          referenceTemplates={referenceTemplates || []}
          referenceTemplateMetrics={referenceTemplateMetrics}
          workspaces={workspaces || []}
          communityTypes={communityTypes || []}
          initialReferenceTemplateId={requestedReferenceTemplateId}
          initialTemplateUsageMode={requestedTemplateUsageMode}
          initialMode={initialMode}
        />
      </Suspense>
      <div className="mt-8">
        <LegalDisclaimer />
      </div>
    </section>
  );
}

function getTemplateUsageMode(value?: string): TemplateUsageMode | undefined {
  if (templateUsageModes.includes(value as TemplateUsageMode)) {
    return value as TemplateUsageMode;
  }

  return undefined;
}
