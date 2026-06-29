import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
import { PersonalCatalogClient } from "@/components/PersonalCatalogClient";
import { getCurrentProfile, type CommunityDocumentTypeRow } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Mi catálogo",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MyCatalogPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: personalCatalogTypes } = await supabase
    .from("community_document_types")
    .select("*")
    .eq("created_by", profile.id)
    .in("status", ["approved", "published"])
    .order("created_at", { ascending: false })
    .returns<CommunityDocumentTypeRow[]>();

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-5 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">Mi catálogo</p>
            <h1 className="section-title mt-3">Tus tipos reutilizables, separados de tus documentos</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Aquí gestionas los documentos personalizados que has convertido en formatos repetibles. Documentos guarda borradores finales; Mi catálogo guarda formas de crear nuevos borradores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/historial" className="focus-ring btn-secondary px-5 py-3 text-sm">
              Ver Documentos
            </Link>
            <Link href="/generar?mode=community" className="focus-ring btn-primary px-5 py-3 text-sm">
              Crear desde Mi catálogo
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ContextualHelp
          eyebrow="Qué es"
          title="Formatos reutilizables"
          description="Un tipo de Mi catálogo no es un archivo final. Es un molde para generar documentos parecidos cuando lo necesites."
          items={["Nace desde documentos a medida o del asistente.", "Tiene campos propios.", "Puede tener guía e instrucciones internas."]}
        />
        <ContextualHelp
          eyebrow="Dónde están"
          title="Documentos aparte"
          description="Los borradores ya creados siguen en Documentos. Aquí solo gestionas los tipos que quieres repetir."
          items={["No borra documentos generados.", "No duplica el historial.", "Evita mezclar archivos con formatos."]}
          secondaryAction={{ href: "/historial", label: "Abrir Documentos" }}
        />
        <ContextualHelp
          eyebrow="Cómo usarlo"
          title="Crear más rápido"
          description="Elige un tipo guardado, rellena sus campos y DocuGen generará un nuevo borrador con esa estructura."
          items={["Usa el botón Usar.", "Edita la guía si cambia el caso.", "Borra tipos que ya no necesites."]}
        />
      </div>

      <PersonalCatalogClient initialTypes={personalCatalogTypes || []} plan={profile.plan} />
    </section>
  );
}
