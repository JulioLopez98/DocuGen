import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunityCatalogClient } from "@/components/CommunityCatalogClient";
import {
  createSupabaseServiceClient,
  getCurrentProfile,
  type CommunityDocumentTypeRow,
  type DocumentRequestRow,
} from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Tipos comunitarios privados",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCommunityCatalogPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const adminClient = createSupabaseServiceClient() || supabase;

  if (!adminClient) {
    redirect("/dashboard");
  }

  const { data: candidates } = await adminClient
    .from("community_document_types")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<CommunityDocumentTypeRow[]>();
  const sourceRequestIds = Array.from(new Set((candidates || []).map((candidate) => candidate.source_request_id).filter(Boolean))) as string[];
  const { data: sourceRequests } = sourceRequestIds.length
    ? await adminClient.from("document_requests").select("*").in("id", sourceRequestIds).returns<DocumentRequestRow[]>()
    : { data: [] };

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:items-end lg:p-8">
          <div className="max-w-4xl">
            <p className="eyebrow">Admin · catálogo comunitario</p>
            <h1 className="section-title mt-3">Revisión privada de nuevos tipos</h1>
            <p className="body-muted mt-4 max-w-2xl">
              Valida los documentos nacidos de solicitudes a medida antes de aprobarlos, publicarlos o convertirlos en
              tipos oficiales dentro del catálogo.
            </p>
          </div>
          <div className="surface-muted p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Cola de catálogo</p>
            <p className="mt-2 font-serif-display text-4xl font-bold">{candidates?.length || 0}</p>
            <p className="mt-2 text-sm text-slate-600">Tipos pendientes o publicados desde solicitudes reales.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin" className="focus-ring btn-secondary px-4 py-3 text-sm">
                Volver a admin
              </Link>
              <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
                Ver generador
              </Link>
            </div>
          </div>
        </div>
      </div>

      <CommunityCatalogClient candidates={candidates || []} sourceRequests={sourceRequests || []} />
    </section>
  );
}
