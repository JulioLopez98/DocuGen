import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
import { HistoryClient } from "@/components/HistoryClient";
import { getCurrentProfile, type BrandSettings, type DocumentRow, type WorkspaceRow } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Historial",
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
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Historial</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Documentos generados</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta, descarga, reutiliza o borra tus borradores. Los documentos aparecen plegados para mantener la
            pantalla ligera.
          </p>
        </div>
        <Link href="/generar" className="focus-ring btn-primary px-4 py-2 text-sm">
          Nuevo documento
        </Link>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <ContextualHelp
          title="Que puedes hacer aqui"
          description="Esta pantalla no es solo un archivo: es tu zona de revision y reutilizacion."
          items={["Abre un documento para editarlo.", "Usalo como base para regenerar.", "Exporta PDF, TXT o Word si tu plan lo permite."]}
        />
        <ContextualHelp
          title="Versiones y mejoras"
          description="Cuando edites o mejores con IA, DocuGen conserva versiones para comparar y restaurar."
          items={["Guarda cambios manuales.", "Compara antes/despues.", "Restaura una version anterior."]}
          secondaryAction={{ href: "/generar", label: "Crear nuevo" }}
        />
        <ContextualHelp
          title="Orden mental"
          description="Los documentos aparecen plegados para que no satures la pantalla."
          items={["Filtra por tipo o fecha.", "Despliega solo lo que quieras revisar.", "Borra elementos cuando ya no los necesites."]}
        />
      </div>

      <HistoryClient
        documents={documents || []}
        canExportDocx={profile.plan !== "free"}
        brandSettings={brandSettings || null}
        workspaces={workspaces || []}
      />
    </section>
  );
}
