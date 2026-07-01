import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
            <h1 className="section-title mt-3">Tus formatos guardados</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Aquí viven los documentos personalizados que quieres repetir. No son archivos finales: son formatos propios para crear nuevos borradores más rápido.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/historial" className="focus-ring btn-secondary px-5 py-3 text-sm">
              Ver documentos
            </Link>
            <Link href="/generar?mode=community" className="focus-ring btn-primary px-5 py-3 text-sm">
              Usar un formato
            </Link>
          </div>
        </div>
      </div>

      <PersonalCatalogClient initialTypes={personalCatalogTypes || []} plan={profile.plan} />
    </section>
  );
}

