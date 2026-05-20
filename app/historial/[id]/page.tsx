import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditableDocumentResult } from "@/components/EditableDocumentResult";
import { getDocumentConfig } from "@/lib/document-types";
import { getCurrentProfile, type BrandSettings, type DocumentRow, type DocumentVersionRow } from "@/lib/supabase-server";
import { templateUsageLabels } from "@/lib/template-usage";

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
  const isCustom = document.doc_type === "custom";
  const isCommunity = document.doc_type.startsWith("community:");
  const createdAt = new Date(document.created_at);
  const { data: brandSettings } =
    profile.plan !== "free"
      ? await supabase.from("brand_settings").select("*").eq("user_id", profile.id).maybeSingle<BrandSettings>()
      : { data: null };
  const { data: versions } = await supabase
    .from("document_versions")
    .select("id,document_id,user_id,version_number,content,change_summary,created_at")
    .eq("document_id", document.id)
    .order("version_number", { ascending: false })
    .returns<DocumentVersionRow[]>();

  return (
    <section className="container-page py-10">
      <div className="mb-6">
        <Link href="/historial" className="text-sm font-semibold text-[#2d6a4f]">
          Volver al historial
        </Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div>
            <p className="eyebrow">{isCustom ? "Documento a medida" : isCommunity ? "Documento comunitario" : config?.category || "Documento"}</p>
            <h1 className="font-serif-display mt-3 text-4xl font-bold">{document.doc_label}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {isCustom
                ? "Documento personalizado guardado en tu historial. Puedes exportarlo, copiarlo o regenerarlo desde la lista."
                : isCommunity
                  ? "Documento generado desde un tipo comunitario aprobado. Puedes exportarlo o crear otro desde el generador."
                : "Documento guardado en tu historial. Puedes exportarlo, copiarlo o reutilizar sus datos como plantilla."}
            </p>
          </div>

          <aside className="surface rounded-md p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Ficha del documento</p>
              <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{profile.plan}</span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <MetaLine label="Creado" value={createdAt.toLocaleDateString("es-ES")} />
              <MetaLine
                label="Hora"
                value={createdAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              />
              <MetaLine label="Tipo" value={isCustom ? "A medida" : isCommunity ? "Comunidad" : config?.label || document.doc_type} />
              <MetaLine label="Modelo" value={document.model_used || "No registrado"} />
              <MetaLine label="Word" value={profile.plan !== "free" ? "Disponible" : "Solo Pro"} />
              {document.reference_template_id && (
                <MetaLine label="Plantilla" value={document.reference_template_name || "Plantilla usada"} />
              )}
              {document.template_usage_mode && <MetaLine label="Modo" value={templateUsageLabels[document.template_usage_mode]} />}
            </div>
            <div className="mt-5 grid gap-2">
              {isCustom ? (
                <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
                  Crear otro a medida
                </Link>
              ) : isCommunity ? (
                <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
                  Crear otro comunitario
                </Link>
              ) : (
                <>
                  <Link href={`/generar?templateId=${document.id}`} className="focus-ring btn-primary px-4 py-3 text-sm">
                    Reutilizar datos
                  </Link>
                  <Link href={`/generar?type=${document.doc_type}`} className="focus-ring btn-secondary px-4 py-3 text-sm">
                    Crear otro igual
                  </Link>
                </>
              )}
              {document.reference_template_id && (
                <Link
                  href={buildSameTemplateUrl(document)}
                  className="focus-ring btn-secondary px-4 py-3 text-sm"
                >
                  Crear nuevo con misma plantilla
                </Link>
              )}
              {document.reference_template_id && (
                <Link href={`/plantillas/${document.reference_template_id}`} className="focus-ring btn-ghost px-4 py-3 text-sm">
                  Ver plantilla usada
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>

      {document.reference_template_id && (
        <section className="surface mb-6 rounded-md p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2 className="font-serif-display mt-2 text-2xl font-bold">Generado con plantilla de referencia</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Este documento uso una plantilla privada para orientar estructura o tono. Los datos finales proceden del
                formulario y la plantilla no debe entenderse como contenido copiado literalmente.
              </p>
            </div>
            <Link href={`/plantillas/${document.reference_template_id}`} className="focus-ring btn-primary px-4 py-3 text-sm">
              Abrir plantilla
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <TraceCard label="Plantilla" value={document.reference_template_name || "Plantilla usada"} />
            <TraceCard label="Modo aplicado" value={document.template_usage_mode ? templateUsageLabels[document.template_usage_mode] : "No registrado"} />
            <TraceCard label="Prioridad" value="Formulario primero" />
          </div>
        </section>
      )}

      <EditableDocumentResult
        documentId={document.id}
        title={document.doc_label}
        initialContent={document.content}
        initialVersions={versions || []}
        includesSignatures={config?.includesSignatures ?? false}
        canExportDocx={profile.plan !== "free"}
        brandSettings={brandSettings || null}
      />
    </section>
  );
}

function buildSameTemplateUrl(document: DocumentRow) {
  const params = new URLSearchParams({
    type: document.doc_type,
  });

  if (document.reference_template_id) {
    params.set("referenceTemplateId", document.reference_template_id);
  }

  if (document.template_usage_mode) {
    params.set("templateUsageMode", document.template_usage_mode);
  }

  return `/generar?${params.toString()}`;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function TraceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
