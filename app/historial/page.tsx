import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HistoryClient } from "@/components/HistoryClient";
import { getCurrentProfile, type BrandSettings, type CommunityDocumentTypeRow, type DocumentRow, type WorkspaceRow } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Documentos",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HistoryPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();
  const { data: brandSettings } =
    profile.plan !== "free"
      ? await supabase.from("brand_settings").select("*").eq("user_id", profile.id).maybeSingle<BrandSettings>()
      : { data: null };
  const { data: personalCatalogTypes } = await supabase
    .from("community_document_types")
    .select("*")
    .eq("created_by", profile.id)
    .in("status", ["approved", "published"])
    .order("created_at", { ascending: false })
    .returns<CommunityDocumentTypeRow[]>();
  const workspaceIds = Array.from(new Set((documents || []).map((document) => document.workspace_id).filter((id): id is string => Boolean(id))));
  const { data: workspaces } = workspaceIds.length
    ? await supabase.from("workspaces").select("*").in("id", workspaceIds).returns<WorkspaceRow[]>()
    : { data: [] as WorkspaceRow[] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-5 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="eyebrow">Documentos</p>
            <h1 className="section-title mt-3">Tu biblioteca de borradores</h1>
            <p className="body-muted mt-4">
              Abre documentos para revisar, editar, exportar, versionar o reutilizar. La lista aparece plegada para que puedas moverte rápido aunque tengas muchos archivos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
              Nuevo documento
            </Link>
            <Link href="/mi-catalogo" className="focus-ring btn-secondary px-5 py-3 text-sm">
              Mi catálogo
            </Link>
          </div>
        </div>
      </div>

      <HistoryClient
        documents={documents || []}
        canExportDocx={profile.plan !== "free"}
        plan={profile.plan}
        brandSettings={brandSettings || null}
        workspaces={workspaces || []}
        personalCatalogTypes={personalCatalogTypes || []}
      />
    </section>
  );
}
