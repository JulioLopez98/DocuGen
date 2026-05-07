import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DocResult } from "@/components/DocResult";
import { getDocumentConfig } from "@/lib/document-types";
import { getCurrentProfile, type DocumentRow } from "@/lib/supabase-server";

type Props = {
  params: {
    id: string;
  };
};

export default async function HistoryDetailPage({ params }: Props) {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: document } = await supabase.from("documents").select("*").eq("id", params.id).single<DocumentRow>();

  if (!document) {
    notFound();
  }

  const config = getDocumentConfig(document.doc_type);

  return (
    <section className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/historial" className="text-sm font-semibold text-[#2d6a4f]">
            Volver al historial
          </Link>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">{document.doc_label}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Creado el {new Date(document.created_at).toLocaleDateString("es-ES")}
          </p>
        </div>
        <Link
          href={`/generar?templateId=${document.id}`}
          className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white"
        >
          Usar como plantilla
        </Link>
      </div>

      <DocResult title={document.doc_label} content={document.content} includesSignatures={config?.includesSignatures} />
    </section>
  );
}
