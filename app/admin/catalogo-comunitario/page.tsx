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
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Admin</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Tipos comunitarios privados</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Revisa los tipos nacidos de solicitudes a medida antes de aprobarlos, publicarlos o convertirlos en documentos oficiales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="focus-ring btn-secondary px-4 py-3 text-sm">
            Volver a admin
          </Link>
          <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
            Ver generador
          </Link>
        </div>
      </div>

      <CommunityCatalogClient candidates={candidates || []} sourceRequests={sourceRequests || []} />
    </section>
  );
}
