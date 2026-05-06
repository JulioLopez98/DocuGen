"use client";

import { useState } from "react";
import { downloadDocumentPdf, downloadDocumentTxt } from "@/lib/pdf";

type DocResultProps = {
  title: string;
  content: string;
  includesSignatures?: boolean;
  onRegenerate?: () => void;
};

export function DocResult({ title, content, includesSignatures, onRegenerate }: DocResultProps) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-md border border-[#d8f3dc] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8f3dc] pb-4">
        <div>
          <p className="text-sm font-semibold text-[#2d6a4f]">Resultado generado</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadDocumentPdf({ title, content, includesSignatures })}
            className="focus-ring rounded-md bg-[#2d6a4f] px-3 py-2 text-sm font-semibold text-white"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => downloadDocumentTxt(title, content)}
            className="focus-ring rounded-md border border-[#2d6a4f] px-3 py-2 text-sm font-semibold text-[#2d6a4f]"
          >
            TXT
          </button>
          <button
            type="button"
            onClick={copyText}
            className="focus-ring rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
            title="Preparado para Fase 2"
          >
            Word
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="focus-ring rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold"
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
