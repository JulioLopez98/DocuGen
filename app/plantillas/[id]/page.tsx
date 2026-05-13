import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TemplateDetailActions } from "@/components/TemplateDetailActions";
import { getCurrentProfile, type DocumentTemplateRow } from "@/lib/supabase-server";

type Props = {
  params: {
    id: string;
  };
};

export const metadata: Metadata = {
  title: "Detalle de plantilla",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TemplateDetailPage({ params }: Props) {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  if (profile.plan === "free") {
    redirect("/precios");
  }

  const { data: template } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", profile.id)
    .single<DocumentTemplateRow>();

  if (!template) {
    notFound();
  }

  const createdAt = new Date(template.created_at);
  const updatedAt = new Date(template.updated_at);

  return (
    <section className="container-page py-10">
      <Link href="/plantillas" className="text-sm font-semibold text-[#2d6a4f]">
        Volver a plantillas
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <p className="eyebrow">{template.category || "Plantilla"}</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">{template.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Archivo propio guardado en tu biblioteca privada. Esta ficha queda preparada para mostrar texto extraido,
            resumen y uso como referencia en generaciones futuras.
          </p>
        </div>

        <aside className="surface rounded-md p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Ficha de plantilla</p>
            <StatusBadge status={template.status} />
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <MetaLine label="Archivo" value={template.original_filename} />
            <MetaLine label="Tipo" value={template.file_type.toUpperCase()} />
            <MetaLine label="Tamano" value={formatBytes(template.file_size)} />
            <MetaLine label="Creada" value={createdAt.toLocaleDateString("es-ES")} />
            <MetaLine label="Actualizada" value={updatedAt.toLocaleDateString("es-ES")} />
          </div>
          <div className="mt-5">
            <TemplateDetailActions template={template} />
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="surface rounded-md p-6">
          <p className="eyebrow">Contexto</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Notas de la plantilla</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <InfoBlock label="Descripcion" value={template.description || "Sin descripcion por ahora."} />
            <InfoBlock label="Categoria" value={template.category || "Sin categoria."} />
            <InfoBlock label="Ruta segura" value={template.storage_path} />
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <p className="eyebrow">Procesamiento</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Texto extraido</h2>
          {template.extracted_text ? (
            <article className="mt-5 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-[#faf9f6] p-5 text-sm leading-7">
              {template.extracted_text}
            </article>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6]/70 p-6">
              <p className="font-semibold">
                {template.status === "failed" ? "No se pudo extraer texto automaticamente" : "Pendiente de extraccion"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {template.file_type === "docx"
                  ? "Pulsa procesar plantilla para extraer texto basico del DOCX."
                  : "Por ahora la extraccion automatica esta disponible solo para DOCX. PDF y DOC quedan preparados para una fase posterior."}
              </p>
            </div>
          )}
          {template.summary && (
            <div className="mt-5 rounded-md border border-[#d8f3dc] bg-white/72 p-4">
              <p className="text-sm font-bold text-[#2d6a4f]">Resumen</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{template.summary}</p>
            </div>
          )}
          {template.error_message && (
            <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{template.error_message}</p>
          )}
        </section>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DocumentTemplateRow["status"] }) {
  const labels: Record<DocumentTemplateRow["status"], string> = {
    uploaded: "Subida",
    processing: "Procesando",
    ready: "Lista",
    failed: "Error",
  };

  return <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{labels[status]}</span>;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function formatBytes(value: number | null) {
  if (!value) {
    return "tamano pendiente";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
