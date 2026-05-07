"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AcuerdoColaboracion } from "@/components/forms/AcuerdoColaboracion";
import { AcuerdoNDA } from "@/components/forms/AcuerdoNDA";
import { AvisoLegal } from "@/components/forms/AvisoLegal";
import { CartaPresentacion } from "@/components/forms/CartaPresentacion";
import { ContratoFreelance } from "@/components/forms/ContratoFreelance";
import { PoliticaPrivacidad } from "@/components/forms/PoliticaPrivacidad";
import { Presupuesto } from "@/components/forms/Presupuesto";
import { PropuestaProyecto } from "@/components/forms/PropuestaProyecto";
import { DocResult } from "@/components/DocResult";
import { documentTypes, getDefaultDocumentType, getDocumentConfig, type DocumentType } from "@/lib/document-types";
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
};

const formComponents: Record<
  DocumentType,
  (props: {
    onSubmit: (payload: { docType: string; formData: Record<string, string> }) => void;
    disabled?: boolean;
    defaultValues?: Record<string, string>;
  }) => JSX.Element
> = {
  "contrato-freelance": ContratoFreelance,
  "presupuesto-comercial": Presupuesto,
  "propuesta-proyecto": PropuestaProyecto,
  "acuerdo-nda": AcuerdoNDA,
  "aviso-legal": AvisoLegal,
  "politica-privacidad": PoliticaPrivacidad,
  "carta-presentacion": CartaPresentacion,
  "acuerdo-colaboracion": AcuerdoColaboracion,
};

export function GeneratorClient({ initialDocType, initialFormData, canExportDocx = false, brandSettings }: GeneratorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<DocumentType>(initialDocType || getDefaultDocumentType(searchParams.get("type")));
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [lastPayload, setLastPayload] = useState<{ docType: string; formData: Record<string, string> } | null>(
    initialFormData && initialDocType ? { docType: initialDocType, formData: initialFormData } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getDocumentConfig(selected)!;
  const SelectedForm = useMemo(() => formComponents[selected], [selected]);
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

          <div className="mt-5 grid gap-2">
            {documentTypes.map((doc) => {
              const active = doc.type === selected;

              return (
                <button
                  key={doc.type}
                  type="button"
                  onClick={() => selectDocument(doc.type)}
                  className={`focus-ring rounded-md border px-4 py-3 text-left transition ${
                    active
                      ? "border-[#2d6a4f] bg-[#d8f3dc]/70 shadow-sm"
                      : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f] hover:bg-white"
                  }`}
                >
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</span>
                  <span className="mt-1 block font-semibold">{doc.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="surface-flat rounded-md p-5">
          <p className="text-sm font-bold text-[#2d6a4f]">Seleccionado</p>
          <h3 className="font-serif-display mt-2 text-2xl font-bold">{config.label}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{config.summary}</p>
          <div className="mt-5 grid gap-2 text-sm">
            <InfoPill label="Campos" value={`${config.fields.length} datos`} />
            <InfoPill label="Firmas" value={config.includesSignatures ? "Incluidas si aplica" : "No necesarias"} />
            <InfoPill label="Word" value={canExportDocx ? "Disponible" : "Solo Pro"} />
          </div>
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
        <SelectedForm
          key={`${selected}-${lastPayload ? "template" : "blank"}`}
          onSubmit={submit}
          disabled={loading}
          defaultValues={lastPayload?.docType === selected ? lastPayload.formData : undefined}
        />
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#1f2933]">{value}</span>
    </div>
  );
}
