import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { PlanBadge } from "@/components/PlanBadge";
import { TemplateLibraryClient } from "@/components/TemplateLibraryClient";
import { buildTemplateUsageMetrics, type TemplateUsageMetricEvent } from "@/lib/template-metrics";
import { getCurrentProfile, type DocumentTemplateRow, type WorkspaceMemberRow, type WorkspaceRow } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Plantillas",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TemplatesPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const isFree = profile.plan === "free";
  const { data: templates } = isFree
    ? { data: [] }
    : await supabase
        .from("document_templates")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<DocumentTemplateRow[]>();
  const { data: templateUsageEvents } = isFree
    ? { data: [] }
    : await supabase
        .from("documents")
        .select("reference_template_id, template_usage_mode, created_at")
        .eq("user_id", profile.id)
        .not("reference_template_id", "is", null)
        .returns<TemplateUsageMetricEvent[]>();
  const templateMetrics = buildTemplateUsageMetrics(templateUsageEvents || []);
  const { data: memberships } =
    profile.plan === "empresa"
      ? await supabase
          .from("workspace_members")
          .select("*")
          .eq("user_id", profile.id)
          .returns<WorkspaceMemberRow[]>()
      : { data: [] as WorkspaceMemberRow[] };
  const workspaceIds = (memberships || []).map((membership) => membership.workspace_id);
  const { data: workspaces } = workspaceIds.length
    ? await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds)
        .order("created_at", { ascending: true })
        .returns<WorkspaceRow[]>()
    : { data: [] as WorkspaceRow[] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface overflow-hidden">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="eyebrow">Plantillas</p>
            <h1 className="section-title mt-3 max-w-4xl">
              Usa tus documentos como referencia
            </h1>
            <p className="body-muted mt-4 max-w-2xl">
              Sube Word/PDF propios para que DocuGen pueda respetar estructura, tono y criterios internos. Plantillas son archivos de referencia; Mi catálogo son formatos guardados para repetir documentos.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isFree ? (
                <Link href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                  Desbloquear con Pro
                </Link>
              ) : (
                <a href="#subir-plantilla" className="focus-ring btn-primary px-5 py-3 text-sm">
                  Subir plantilla
                </a>
              )}
              <Link href="/catalogo" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Ver catálogo
              </Link>
            </div>
          </div>

          <aside className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#2d6a4f]">Estado</p>
              <PlanBadge plan={profile.plan} />
            </div>
            <p className="mt-4 font-serif-display text-3xl font-bold">{isFree ? "Solo Pro" : `${templates?.length || 0} guardadas`}</p>
            <p className="body-muted mt-3">
              {isFree
                ? "La biblioteca de plantillas está orientada a usuarios Pro y Empresa."
                : "Tu biblioteca ya acepta archivos PDF, DOC y DOCX de hasta 10 MB."}
            </p>
          </aside>
        </div>
      </div>

      <div id="subir-plantilla" className="mt-6 scroll-mt-24">
        {isFree ? (
          <EmptyState
            eyebrow="Funcion Pro"
            title="Desbloquea la biblioteca de plantillas"
            description="Con Pro podrás subir documentos propios, conservarlos en una biblioteca privada y prepararlos para generar nuevos borradores con tu estilo."
            primaryAction={{ href: "/precios", label: "Ver planes Pro" }}
            secondaryAction={{ href: "/generar", label: "Seguir generando" }}
            steps={["Crea primero con los tipos esenciales.", "Prepara archivos DOCX/PDF limpios.", "Activa Pro cuando quieras usar tu estilo propio."]}
          />
        ) : (
          <TemplateLibraryClient
            userId={profile.id}
            initialTemplates={templates || []}
            initialTemplateMetrics={templateMetrics}
            workspaces={workspaces || []}
            plan={profile.plan === "empresa" ? "empresa" : "pro"}
          />
        )}
      </div>
    </section>
  );
}
