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

type GeneratedDocument = {
  id: string;
  docType: DocumentType;
  docLabel: string;
  content: string;
  formData: Record<string, string>;
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

export function GeneratorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<DocumentType>(getDefaultDocumentType(searchParams.get("type")));
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [lastPayload, setLastPayload] = useState<{ docType: string; formData: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getDocumentConfig(selected)!;
  const SelectedForm = useMemo(() => formComponents[selected], [selected]);

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
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <aside className="rounded-md border border-[#d8f3dc] bg-white p-5">
        <label>
          <span className="text-sm font-semibold">Tipo de documento</span>
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value as DocumentType);
              setGenerated(null);
              setError(null);
            }}
            className="focus-ring mt-2 w-full rounded-md border border-slate-300 px-3 py-3 text-sm"
          >
            {documentTypes.map((doc) => (
              <option key={doc.type} value={doc.type}>
                {doc.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-4 text-sm leading-6 text-slate-600">{config.summary}</p>
      </aside>

      <section className="rounded-md border border-[#d8f3dc] bg-white p-5">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#2d6a4f]">{config.category}</p>
          <h1 className="font-serif-display mt-1 text-3xl font-bold">{config.label}</h1>
        </div>
        <SelectedForm onSubmit={submit} disabled={loading} defaultValues={lastPayload?.formData} />
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {generated && (
        <div className="lg:col-span-2">
          <DocResult
            title={generated.docLabel}
            content={generated.content}
            includesSignatures={getDocumentConfig(generated.docType)?.includesSignatures}
            onRegenerate={() => lastPayload && submit(lastPayload)}
          />
        </div>
      )}
    </div>
  );
}
