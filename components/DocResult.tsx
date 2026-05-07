"use client";

import { useState } from "react";
import { downloadDocumentDocx } from "@/lib/docx";
import { downloadDocumentPdf, downloadDocumentTxt } from "@/lib/pdf";

type DocResultProps = {
  title: string;
  content: string;
  includesSignatures?: boolean;
  canExportDocx?: boolean;
  onRegenerate?: () => void;
};

export function DocResult({ title, content, includesSignatures, canExportDocx = false, onRegenerate }: DocResultProps) {
  const [copied, setCopied] = useState(false);

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
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadDocumentPdf({ title, content, includesSignatures })}
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
            title={canExportDocx ? "Descargar Word" : "Word solo está disponible en el plan Pro"}
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
      <article className="mt-5 whitespace-pre-wrap rounded-md bg-[#faf9f6] p-5 text-sm leading-7">{content}</article>
    </section>
  );
}
