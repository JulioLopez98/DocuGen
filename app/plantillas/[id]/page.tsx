import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TemplateDetailActions } from "@/components/TemplateDetailActions";
import { TemplateVariablesEditor } from "@/components/TemplateVariablesEditor";
import { getDocumentConfig } from "@/lib/document-types";
import { getCurrentProfile, type DocumentRow, type DocumentTemplateRow } from "@/lib/supabase-server";
import { getTemplateQaReport, getTemplateQaStyles, type TemplateQaCheck } from "@/lib/template-qa";
import { buildTemplateUsageMetrics, getTemplateUsageMetrics } from "@/lib/template-metrics";
import { templateUsageLabels } from "@/lib/template-usage";
import { readTemplateVariables, type EditableTemplateVariable } from "@/lib/template-variables";

type Props = {
  params: {
    id: string;
  };
};

type LinkedTemplateDocument = Pick<
  DocumentRow,
  "id" | "doc_type" | "doc_label" | "created_at" | "template_usage_mode"
>;

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
  const { data: generatedDocuments } = await supabase
    .from("documents")
    .select("id, doc_type, doc_label, created_at, template_usage_mode")
    .eq("user_id", profile.id)
    .eq("reference_template_id", template.id)
    .order("created_at", { ascending: false })
    .returns<LinkedTemplateDocument[]>();

  const allDocumentsFromTemplate = generatedDocuments || [];
  const documentsFromTemplate = allDocumentsFromTemplate.slice(0, 8);
  const templateMetrics = getTemplateUsageMetrics(
    buildTemplateUsageMetrics(
      allDocumentsFromTemplate.map((document) => ({
        reference_template_id: template.id,
        template_usage_mode: document.template_usage_mode,
        created_at: document.created_at,
      })),
    ),
    template.id,
  );
  const textStats = getTextStats(template.extracted_text || "");
  const canUseTemplate = template.status === "ready" && Boolean(template.extracted_text);
  const templateAnalysis = getTemplateAnalysis(template.extracted_metadata);
  const qaReport = getTemplateQaReport(template);

  return (
    <section className="container-page py-10">
      <Link href="/plantillas" className="text-sm font-semibold text-[#2d6a4f]">
        Volver a plantillas
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <p className="eyebrow">{template.category || "Plantilla"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-serif-display text-4xl font-bold">{template.name}</h1>
            {template.is_favorite && (
              <span className="rounded-full bg-[#1f2933] px-3 py-1 text-xs font-bold text-white">Destacada</span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Archivo propio guardado en tu biblioteca privada. Revisa su estado, resumen, texto extraido y los documentos
            que ya se han generado usando esta referencia.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {canUseTemplate && (
              <Link href={`/generar?referenceTemplateId=${template.id}`} className="focus-ring btn-primary px-5 py-3 text-sm">
                Usar como referencia
              </Link>
            )}
            {canUseTemplate && (
              <Link href={`/plantillas/${template.id}/generar`} className="focus-ring btn-secondary px-5 py-3 text-sm">
                Generar desde variables
              </Link>
            )}
            <Link href="/plantillas" className="focus-ring btn-secondary px-5 py-3 text-sm">
              Ver biblioteca
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Metric label="Estado" value={statusLabel(template.status)} />
            <Metric label="Texto extraido" value={textStats.words > 0 ? `${textStats.words} palabras` : "Pendiente"} />
            <Metric label="Usos" value={`${templateMetrics.totalUses} documentos`} />
            <Metric label="Ultimo uso" value={formatDateOrNever(templateMetrics.lastUsedAt)} />
          </div>

          <section className={`mt-6 rounded-md border p-5 ${getTemplateQaStyles(qaReport.level)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em]">QA de plantilla</p>
                <h2 className="mt-2 font-serif-display text-2xl font-bold">{qaReport.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6">{qaReport.summary}</p>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">Calidad {qaReport.score || 0}/100</span>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {qaReport.checks.map((check) => (
                <QaCheckCard key={check.label} check={check} />
              ))}
            </div>
          </section>
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
            {canUseTemplate ? (
              <div className="mb-2 grid gap-2">
                <Link
                  href={`/plantillas/${template.id}/generar`}
                  className="focus-ring btn-primary w-full px-4 py-3 text-center text-sm"
                >
                  Generar desde variables
                </Link>
                <Link
                  href={`/generar?referenceTemplateId=${template.id}`}
                  className="focus-ring btn-secondary w-full px-4 py-3 text-center text-sm"
                >
                  Usar como referencia
                </Link>
              </div>
            ) : (
              <div className="mb-3 rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6] p-4 text-sm leading-6 text-slate-600">
                Procesa la plantilla para poder usarla como referencia dentro del generador.
              </div>
            )}
            <TemplateDetailActions template={template} />
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="surface rounded-md p-6">
          <p className="eyebrow">Resumen</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Lectura rapida</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Esta zona sirve para decidir si la plantilla esta lista para usarse y que tipo de referencia aporta al generador.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <InfoBlock label="Resumen extraido" value={template.summary || "Procesa la plantilla para obtener un resumen automatico."} />
            <InfoBlock label="Descripcion propia" value={template.description || "Sin descripcion por ahora."} />
            <InfoBlock label="Categoria" value={template.category || templateAnalysis.suggestedCategory || "Sin categoria."} />
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <p className="eyebrow">Procesamiento</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-serif-display text-3xl font-bold">Texto extraido</h2>
            {textStats.words > 0 && (
              <p className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                {textStats.words} palabras | {textStats.characters} caracteres
              </p>
            )}
          </div>
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
          {template.error_message && (
            <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{template.error_message}</p>
          )}
        </section>
      </div>

      <section className="surface mt-6 rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Analisis</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Estructura y estilo detectados</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Estos datos ayudan a DocuGen a usar la plantilla como referencia sin copiar informacion concreta.
            </p>
          </div>
          <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
            Calidad {templateAnalysis.qualityScore || 0}/100
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBlock label="Categoria sugerida" value={templateAnalysis.suggestedCategory || "Sin categoria sugerida."} />
          <InfoBlock label="Tono detectado" value={templateAnalysis.toneLabel || "Sin tono detectado."} />
          <InfoBlock
            label="Senales sensibles"
            value={
              templateAnalysis.sensitiveSignals.length > 0
                ? templateAnalysis.sensitiveSignals.join(", ")
                : "No se han detectado datos concretos destacados."
            }
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <AnalysisList title="Secciones" items={templateAnalysis.sections} empty="No se han detectado secciones claras." />
          <AnalysisList title="Clausulas o bloques" items={templateAnalysis.clauses} empty="No se han detectado bloques reutilizables." />
          <TemplateVariablesEditor templateId={template.id} initialVariables={templateAnalysis.variables} />
        </div>

        {templateAnalysis.warnings.length > 0 && (
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Avisos de calidad</p>
            <ul className="mt-2 grid gap-1 text-sm text-amber-900">
              {templateAnalysis.warnings.map((warning) => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          </div>
        )}
        {qaReport.sensitiveSignals.length > 0 && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">Datos concretos detectados</p>
            <p className="mt-2 text-sm leading-6 text-red-800">
              La plantilla contiene {qaReport.sensitiveSignals.join(", ")}. DocuGen los trata como señales que no deben
              copiarse al documento final, pero conviene revisar el texto extraido y sustituir ejemplos reales por
              marcadores.
            </p>
          </div>
        )}
      </section>

      <section className="surface mt-6 rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Uso</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Documentos creados con esta plantilla</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Aqui aparecen los ultimos documentos que usaron esta plantilla como referencia, junto con su patron de uso.
            </p>
          </div>
          {canUseTemplate && (
            <Link href={`/plantillas/${template.id}/generar`} className="focus-ring btn-primary px-4 py-3 text-sm">
              Crear otro
            </Link>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Total generado" value={`${templateMetrics.totalUses} documentos`} />
          <Metric label="Ultimo uso" value={formatDateOrNever(templateMetrics.lastUsedAt)} />
          <Metric label="Modo mas usado" value={getUsageModeLabel(templateMetrics.mostUsedMode)} />
        </div>

        <div className="mt-5 grid gap-3">
          {documentsFromTemplate.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6]/70 p-6">
              <p className="font-semibold">Aun no se ha usado en generaciones</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Cuando generes documentos usando esta plantilla, apareceran aqui para que puedas abrirlos o reutilizarlos.
              </p>
            </div>
          ) : (
            documentsFromTemplate.map((document) => (
              <article
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/75 p-4"
              >
                <div>
                  <h3 className="font-semibold">{document.doc_label}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {getDocumentLabel(document.doc_type)} | {new Date(document.created_at).toLocaleDateString("es-ES")} |{" "}
                    {getUsageModeLabel(document.template_usage_mode)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/historial/${document.id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                    Abrir
                  </Link>
                  <Link href={`/generar?templateId=${document.id}`} className="focus-ring btn-ghost px-3 py-2 text-xs">
                    Reutilizar
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="surface mt-6 rounded-md p-6">
        <p className="eyebrow">Metadatos</p>
        <h2 className="font-serif-display mt-3 text-3xl font-bold">Datos tecnicos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoBlock label="Archivo original" value={template.original_filename} />
          <InfoBlock label="Tipo de archivo" value={template.file_type.toUpperCase()} />
          <InfoBlock label="Tamano" value={formatBytes(template.file_size)} />
          <InfoBlock label="Ruta privada" value={template.storage_path} />
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-flat rounded-md p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentTemplateRow["status"] }) {
  return <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{statusLabel(status)}</span>;
}

function QaCheckCard({ check }: { check: TemplateQaCheck }) {
  const styles: Record<TemplateQaCheck["status"], string> = {
    ok: "border-[#2d6a4f] bg-white/70",
    review: "border-amber-300 bg-white/70",
    missing: "border-orange-300 bg-white/70",
    blocked: "border-red-300 bg-white/70",
  };
  const labels: Record<TemplateQaCheck["status"], string> = {
    ok: "OK",
    review: "Revisar",
    missing: "Falta",
    blocked: "Bloqueado",
  };

  return (
    <div className={`rounded-md border p-3 ${styles[check.status]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold">{check.label}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">{labels[check.status]}</span>
      </div>
      <p className="mt-2 text-xs leading-5">{check.detail}</p>
    </div>
  );
}

function statusLabel(status: DocumentTemplateRow["status"]) {
  const labels: Record<DocumentTemplateRow["status"], string> = {
    uploaded: "Subida",
    processing: "Procesando",
    ready: "Lista",
    failed: "Error",
  };

  return labels[status];
}

function getTextStats(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return { words: 0, characters: 0 };
  }

  return {
    words: trimmed.split(/\s+/).filter(Boolean).length,
    characters: trimmed.length,
  };
}

function getDocumentLabel(docType: string) {
  return getDocumentConfig(docType)?.label || docType;
}

function getUsageModeLabel(mode: DocumentRow["template_usage_mode"]) {
  if (!mode) {
    return "Sin datos";
  }

  return templateUsageLabels[mode];
}

function formatDateOrNever(value: string | null) {
  if (!value) {
    return "Sin uso";
  }

  return new Date(value).toLocaleDateString("es-ES");
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

function AnalysisList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
          {items.slice(0, 8).map((item) => (
            <li key={item} className="rounded-md bg-[#faf9f6] px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-600">{empty}</p>
      )}
    </div>
  );
}

type TemplateAnalysis = {
  suggestedCategory: string | null;
  toneLabel: string | null;
  qualityScore: number | null;
  sections: string[];
  clauses: string[];
  variables: EditableTemplateVariable[];
  sensitiveSignals: string[];
  warnings: string[];
};

function getTemplateAnalysis(metadata: Record<string, unknown> | null): TemplateAnalysis {
  const quality = readRecord(metadata?.quality);

  return {
    suggestedCategory: readString(metadata?.suggestedCategory),
    toneLabel: readString(readRecord(metadata?.tone)?.label),
    qualityScore: readNumber(quality?.score),
    sections: readNamedItems(metadata?.sections, "title"),
    clauses: readNamedItems(metadata?.clauses, "title"),
    variables: readTemplateVariables(metadata),
    sensitiveSignals: readStringArray(metadata?.sensitiveSignals),
    warnings: readStringArray(quality?.warnings),
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readNamedItems(value: unknown, key: string) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => readString(readRecord(item)?.[key]))
    .filter((item): item is string => Boolean(item));
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
