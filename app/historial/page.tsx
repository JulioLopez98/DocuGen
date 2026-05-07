import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryClient } from "@/components/HistoryClient";
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
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta, descarga, reutiliza o borra tus borradores. Los documentos aparecen plegados para mantener la
            pantalla ligera.
          </p>
        </div>
        <Link href="/generar" className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white">
          Nuevo documento
        </Link>
      </div>

      <HistoryClient documents={documents || []} />
    </section>
  );
}
