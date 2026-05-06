import Link from "next/link";
import { redirect } from "next/navigation";
import { DocResult } from "@/components/DocResult";
import { getDocumentConfig } from "@/lib/document-types";
import { getCurrentProfile, type DocumentRow } from "@/lib/supabase-server";

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

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">Historial</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Documentos generados</h1>
        </div>
        <Link href="/generar" className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white">
          Nuevo documento
        </Link>
      </div>

      <div className="grid gap-5">
        {(documents || []).map((doc) => (
          <div key={doc.id}>
            <DocResult
              title={doc.doc_label}
              content={doc.content}
              includesSignatures={getDocumentConfig(doc.doc_type)?.includesSignatures}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/generar?type=${doc.doc_type}`}
                className="rounded-md border border-[#2d6a4f] px-3 py-2 text-xs font-semibold text-[#2d6a4f]"
              >
                Usar como plantilla
              </Link>
              <Link
                href={`/generar?type=${doc.doc_type}`}
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold"
              >
                Regenerar
              </Link>
            </div>
          </div>
        ))}
        {(!documents || documents.length === 0) && (
          <div className="rounded-md border border-[#d8f3dc] bg-white p-6 text-sm text-slate-600">
            Aún no hay documentos en tu historial.
          </div>
        )}
      </div>
    </section>
  );
}
