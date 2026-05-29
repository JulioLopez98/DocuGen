import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
import { HistoryClient } from "@/components/HistoryClient";
import { getCurrentProfile, type BrandSettings, type DocumentRow, type WorkspaceRow } from "@/lib/supabase-server";

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
  const workspaceIds = Array.from(new Set((documents || []).map((document) => document.workspace_id).filter((id): id is string => Boolean(id))));
  const { data: workspaces } = workspaceIds.length
    ? await supabase.from("workspaces").select("*").in("id", workspaceIds).returns<WorkspaceRow[]>()
    : { data: [] as WorkspaceRow[] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-5 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <h1 className="section-title mt-3">Tus documentos, ordenados para revisar y reutilizar</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Consulta borradores, abre versiones editables, exporta archivos y usa documentos anteriores como punto de partida.
              Todo aparece plegado para mantener la pantalla ligera.
            </p>
          </div>
          <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
            Nuevo documento
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ContextualHelp
          eyebrow="Uso diario"
          title="Revisar"
          description="Abre un documento para editarlo, mejorar con IA, comparar versiones o restaurar cambios."
          items={["Detalle editable.", "Historial de versiones.", "Exportación PDF/TXT/Word."]}
        />
        <ContextualHelp
          eyebrow="Productividad"
          title="Reutilizar"
          description="Convierte documentos anteriores en base para nuevos borradores sin volver a rellenar todo."
          items={["Reutiliza datos.", "Regenera variantes.", "Mantén plantilla si aplica."]}
          secondaryAction={{ href: "/generar", label: "Crear nuevo" }}
        />
        <ContextualHelp
          eyebrow="Orden"
          title="Limpiar"
          description="Filtra por tipo, busca contenido y borra documentos que ya no necesites."
          items={["Búsqueda por texto.", "Agrupación por mes.", "Borrado individual o completo."]}
        />
      </div>

      <HistoryClient
        documents={documents || []}
        canExportDocx={profile.plan !== "free"}
        plan={profile.plan}
        brandSettings={brandSettings || null}
        workspaces={workspaces || []}
      />
    </section>
  );
}
