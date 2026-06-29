"use client";

import Link from "next/link";
import { useState } from "react";
import { SaveToCatalogCard } from "@/components/SaveToCatalogCard";
import { downloadDocumentDocx } from "@/lib/docx";
import { downloadDocumentPdf, downloadDocumentTxt, type PdfBrandSettings } from "@/lib/pdf";
import { refinementLabels, type RefinementMode } from "@/lib/refinement";
import { templateUsageLabels, type TemplateUsageMode } from "@/lib/template-usage";

export type DocumentTemplateTrace = {
  id: string;
  name: string;
  usageMode: TemplateUsageMode;
};

type DocResultProps = {
  documentId?: string;
  docType?: string;
  title: string;
  content: string;
  includesSignatures?: boolean;
  canExportDocx?: boolean;
  brandSettings?: PdfBrandSettings | null;
  templateTrace?: DocumentTemplateTrace | null;
  canSaveToCatalog?: boolean;
  onRegenerate?: () => void;
  onRefine?: (mode: RefinementMode) => void;
  refiningMode?: RefinementMode | null;
};

export function DocResult({
  documentId,
  docType,
  title,
  content,
  includesSignatures,
  canExportDocx = false,
  brandSettings,
  templateTrace = null,
  canSaveToCatalog = false,
  onRegenerate,
  onRefine,
  refiningMode = null,
}: DocResultProps) {
  const [copied, setCopied] = useState(false);
  const refinementModes = Object.entries(refinementLabels) as [RefinementMode, string][];

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }


  return (
    <section className="surface rounded-md p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8f3dc] pb-4">
        <div>
          <p className="text-sm font-semibold text-[#2d6a4f]">Resultado generado</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
          {documentId && (
            <p className="mt-1 text-xs text-slate-500">
              Guardado automaticamente en Documentos. Puedes descargarlo, copiarlo o reutilizarlo cuando quieras.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadDocumentPdf({ title, content, includesSignatures, brandSettings })}
            className="focus-ring btn-primary px-3 py-2 text-sm"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => downloadDocumentTxt(title, content)}
            className="focus-ring btn-secondary px-3 py-2 text-sm"
          >
            TXT
          </button>
          <button
            type="button"
            onClick={copyText}
            className="focus-ring btn-ghost px-3 py-2 text-sm"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={() => downloadDocumentDocx({ title, content, includesSignatures, canExportDocx })}
            className={
              canExportDocx
                ? "focus-ring btn-secondary px-3 py-2 text-sm"
                : "focus-ring rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
            }
            title={canExportDocx ? "Descargar Word" : "Word solo esta disponible en el plan Pro"}
          >
            {canExportDocx ? "Word" : "Word Pro"}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="focus-ring btn-ghost px-3 py-2 text-sm"
            >
              Volver a generar
            </button>
          )}
        </div>
      </div>
      {canSaveToCatalog && documentId && (
        <div className="mt-5">
          <SaveToCatalogCard documentId={documentId} title={title} />
        </div>
      )}
      {templateTrace && (
        <div className="mt-5 rounded-md border border-[#2d6a4f] bg-[#f4fbf5] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Trazabilidad de generacion</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Este documento se genero usando una plantilla como referencia de estructura o tono. La plantilla orienta
                el resultado, pero no debe copiar datos concretos ni sustituir la informacion del formulario.
              </p>
            </div>
            <Link href={`/plantillas/${templateTrace.id}`} className="focus-ring btn-ghost px-3 py-2 text-xs">
              Abrir plantilla
            </Link>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
            <TracePill label="Plantilla" value={templateTrace.name} />
            <TracePill label="Modo" value={templateUsageLabels[templateTrace.usageMode]} />
            <TracePill label="Prioridad" value="Formulario primero" />
          </div>
        </div>
      )}
      {onRefine && (
        <div className="mt-5 rounded-md border border-[#d8f3dc] bg-[#fffdf8]/74 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Mejorar esta version</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Crea una variante guardada en Documentos sin perder esta version.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {refinementModes.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onRefine(mode)}
                  disabled={refiningMode !== null}
                  className="focus-ring btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refiningMode === mode ? "Mejorando..." : label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {!canExportDocx && (
        <div className="mt-4 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Word esta incluido en Pro</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                En Free puedes descargar PDF y TXT. Pro anade Word editable, documentos avanzados, plantillas y marca.
              </p>
            </div>
            <Link href="/precios" className="focus-ring btn-primary px-3 py-2 text-xs">
              Ver Pro
            </Link>
          </div>
        </div>
      )}
      {(documentId || docType) && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
          {documentId && (
            <Link href={`/historial/${documentId}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
              Ver en Documentos
            </Link>
          )}
          {documentId && (
            <Link href={`/generar?templateId=${documentId}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
              Reutilizar datos
            </Link>
          )}
          {docType && (
            <Link href={`/generar?type=${docType}`} className="focus-ring btn-ghost px-3 py-2 text-xs">
              Crear otro parecido
            </Link>
          )}
        </div>
      )}
      <article className="mt-5 whitespace-pre-wrap rounded-md bg-[#faf9f6] p-5 text-sm leading-7">{content}</article>
    </section>
  );
}

function TracePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#fffdf8]/76 px-3 py-2">
      <span className="block font-bold text-[#1f2933]">{label}</span>
      <span className="mt-1 block leading-5">{value}</span>
    </div>
  );
}
