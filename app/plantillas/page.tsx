import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
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
    <section className="container-page py-10">
      <div className="surface overflow-hidden rounded-md">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="eyebrow">Plantillas</p>
            <h1 className="font-serif-display mt-3 max-w-4xl text-5xl font-bold leading-tight">
              Tu biblioteca de documentos propios
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Sube documentos Word/PDF de tu empresa para construir una biblioteca privada. En esta primera version
              puedes guardar, descargar y borrar plantillas; despues las usaremos como referencia de generacion.
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
                Ver tipos disponibles
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-[#d8f3dc] bg-white/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#2d6a4f]">Estado</p>
              <PlanBadge plan={profile.plan} />
            </div>
            <p className="mt-4 font-serif-display text-3xl font-bold">{isFree ? "Solo Pro" : `${templates?.length || 0} guardadas`}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isFree
                ? "La biblioteca de plantillas esta orientada a usuarios Pro y Empresa."
                : "Tu biblioteca ya acepta archivos PDF, DOC y DOCX de hasta 10 MB."}
            </p>
          </aside>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Sube documentos", "Word/PDF con plantillas, ejemplos, clausulas o documentos anteriores."],
          ["2", "Guarda tu biblioteca", "Cada archivo queda asociado a tu cuenta y protegido con RLS."],
          ["3", "Prepara el siguiente salto", "Despues extraeremos texto y lo conectaremos con la generacion."],
        ].map(([step, title, text]) => (
          <article key={step} className="surface-flat rounded-md p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">
              {step}
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ContextualHelp
          title="Cuando usar plantillas"
          description="Usalas si ya tienes documentos buenos y quieres que los nuevos respeten estructura, tono o criterios internos."
          items={["No sustituyen los datos del formulario.", "No copian informacion sensible.", "Sirven como referencia controlada."]}
          primaryAction={isFree ? { href: "/precios", label: "Ver Pro" } : { href: "#subir-plantilla", label: "Subir plantilla" }}
          tone="pro"
        />
        <ContextualHelp
          title="Como preparar un archivo"
          description="Sube ejemplos limpios: sin versiones mezcladas, con apartados claros y sin datos que no quieras usar como referencia."
          items={["DOCX suele dar mejores resultados.", "PDF tambien sirve si el texto se puede extraer.", "Marca favoritas para recomendarlas al generar."]}
          secondaryAction={{ href: "/generar", label: "Ir al generador" }}
        />
      </section>

      <div id="subir-plantilla" className="mt-6 scroll-mt-24">
        {isFree ? (
          <EmptyState
            eyebrow="Funcion Pro"
            title="Desbloquea la biblioteca de plantillas"
            description="Con Pro podras subir documentos propios, conservarlos en una biblioteca privada y prepararlos para generar nuevos borradores con tu estilo."
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
