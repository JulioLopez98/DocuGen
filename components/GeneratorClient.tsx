"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormShell } from "@/components/forms/FormShell";
import { DocResult } from "@/components/DocResult";
import { documentTypes, getDefaultDocumentType, getDocumentConfig, requiresPro, type DocumentType } from "@/lib/document-types";
import type { PdfBrandSettings } from "@/lib/pdf";

type GeneratedDocument = {
  id: string;
  docType: DocumentType;
  docLabel: string;
  content: string;
  formData: Record<string, string>;
};

type GeneratorClientProps = {
  initialDocType?: DocumentType;
  initialFormData?: Record<string, string>;
  canExportDocx?: boolean;
  brandSettings?: PdfBrandSettings | null;
  plan?: "free" | "pro" | "empresa";
};

export function GeneratorClient({
  initialDocType,
  initialFormData,
  canExportDocx = false,
  brandSettings,
  plan = "free",
}: GeneratorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<DocumentType>(initialDocType || getDefaultDocumentType(searchParams.get("type")));
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [lastPayload, setLastPayload] = useState<{ docType: string; formData: Record<string, string> } | null>(
    initialFormData && initialDocType ? { docType: initialDocType, formData: initialFormData } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentQuery, setDocumentQuery] = useState("");

  const config = getDocumentConfig(selected)!;
  const proLocked = plan === "free" && requiresPro(config);
  const freeTypes = useMemo(() => documentTypes.filter((doc) => !requiresPro(doc)).length, []);
  const groupedDocuments = useMemo(() => groupDocumentTypes(documentQuery), [documentQuery]);
  const isTemplateMode = Boolean(initialFormData && initialDocType);

  function selectDocument(type: DocumentType) {
    setSelected(type);
    setGenerated(null);
    setError(null);
    setLastPayload(null);
    router.replace(`/generar?type=${type}`, { scroll: false });
  }

  async function submit(payload: { docType: string; formData: Record<string, string> }) {
    setLoading(true);
    setError(null);
    setLastPayload(payload);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GeneratedDocument & { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo generar el documento.");
        return;
      }

      setGenerated(data);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[390px_1fr]">
      <aside className="space-y-4">
        <section className="surface rounded-md p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Documento</p>
              <h2 className="font-serif-display mt-2 text-2xl font-bold">Elige el tipo</h2>
            </div>
            <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{documentTypes.length} tipos</span>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar documento</span>
            <input
              value={documentQuery}
              onChange={(event) => setDocumentQuery(event.target.value)}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
              placeholder="Contrato, cookies, reclamacion..."
            />
          </label>

          <div className="mt-5 grid gap-2">
            {groupedDocuments.map((group) => (
              <details
                key={group.category}
                open={documentQuery.trim().length > 0 || group.category === config.category}
                className="rounded-md border border-[#d8f3dc] bg-white/58"
              >
                <summary className="cursor-pointer list-none px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[#1f2933]">{group.category}</span>
                    <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-xs font-bold text-[#2d6a4f]">
                      {group.documents.length}
                    </span>
                  </div>
                </summary>
                <div className="grid gap-2 border-t border-[#d8f3dc] p-2">
                  {group.documents.map((doc) => {
                    const active = doc.type === selected;

                    return (
                      <button
                        key={doc.type}
                        type="button"
                        onClick={() => selectDocument(doc.type)}
                        className={`focus-ring rounded-md border px-3 py-3 text-left transition ${
                          active
                            ? "border-[#2d6a4f] bg-[#d8f3dc]/70 shadow-sm"
                            : "border-transparent bg-white/70 hover:border-[#2d6a4f] hover:bg-white"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                          {doc.label}
                          {requiresPro(doc) && (
                            <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold text-white">Pro</span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{doc.summary}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
            {groupedDocuments.length === 0 && (
              <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4 text-sm text-slate-600">
                No hay documentos que coincidan con esa busqueda.
              </div>
            )}
          </div>
        </section>

        <section className="surface-flat rounded-md p-5">
          <p className="text-sm font-bold text-[#2d6a4f]">Seleccionado</p>
          <h3 className="font-serif-display mt-2 text-2xl font-bold">{config.label}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{config.summary}</p>
          <div className="mt-5 grid gap-2 text-sm">
            <InfoPill label="Campos" value={`${config.fields.length} datos`} />
            <InfoPill label="Firmas" value={config.includesSignatures ? "Incluidas si aplica" : "No necesarias"} />
            <InfoPill label="Acceso" value={requiresPro(config) ? "Solo Pro" : "Free"} />
            <InfoPill label="Word" value={canExportDocx ? "Disponible" : "Solo Pro"} />
          </div>
          {plan === "free" && (
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Free incluye {freeTypes} tipos. Pro desbloquea documentos laborales y legales avanzados.
            </p>
          )}
          {isTemplateMode && (
            <p className="mt-4 rounded-md bg-[#d8f3dc] p-3 text-sm text-[#1f2933]">
              Has cargado datos desde un documento del historial.
            </p>
          )}
        </section>
      </aside>

      <section className="surface rounded-md p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-5">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">{config.category}</p>
            <h1 className="font-serif-display mt-1 text-3xl font-bold">{config.label}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Completa los datos principales. DocuGen no inventara informacion no aportada y usara marcadores si falta algo.
            </p>
          </div>
          {loading && <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">Generando...</span>}
        </div>
        {proLocked ? (
          <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-6">
            <p className="eyebrow">Documento Pro</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Desbloquea {config.label.toLowerCase()}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Este documento esta reservado para DocuGen Pro porque requiere instrucciones mas avanzadas y suele tener
              mayor impacto laboral, legal o comercial.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                Ver Pro
              </Link>
              <button type="button" onClick={() => selectDocument("contrato-freelance")} className="focus-ring btn-secondary px-5 py-3 text-sm">
                Elegir documento Free
              </button>
            </div>
          </div>
        ) : (
          <FormShell
            key={`${selected}-${lastPayload ? "template" : "blank"}`}
            config={config}
            onSubmit={submit}
            disabled={loading}
            defaultValues={lastPayload?.docType === selected ? lastPayload.formData : undefined}
          />
        )}
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {generated && (
        <div className="lg:col-span-2">
          <DocResult
            title={generated.docLabel}
            content={generated.content}
            includesSignatures={getDocumentConfig(generated.docType)?.includesSignatures}
            canExportDocx={canExportDocx}
            brandSettings={brandSettings}
            onRegenerate={() => lastPayload && submit(lastPayload)}
          />
        </div>
      )}
    </div>
  );
}

function groupDocumentTypes(query: string) {
  const groups = new Map<string, typeof documentTypes[number][]>();
  const normalizedQuery = query.trim().toLowerCase();

  for (const doc of documentTypes) {
    const searchable = `${doc.label} ${doc.summary} ${doc.category}`.toLowerCase();

    if (normalizedQuery && !searchable.includes(normalizedQuery)) {
      continue;
    }

    groups.set(doc.category, [...(groups.get(doc.category) || []), doc]);
  }

  return Array.from(groups.entries()).map(([category, documents]) => ({
    category,
    documents,
  }));
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#1f2933]">{value}</span>
    </div>
  );
}
