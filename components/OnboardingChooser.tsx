"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getDocumentConfig, requiresPro, type DocumentType } from "@/lib/document-types";

type PersonaId = "autonomo" | "empresa" | "agencia" | "rrhh" | "ecommerce" | "legal";

type Persona = {
  id: PersonaId;
  label: string;
  description: string;
  documents: DocumentType[];
};

type OnboardingChooserProps = {
  plan: "free" | "pro" | "empresa";
};

const personas: Persona[] = [
  {
    id: "autonomo",
    label: "Autónomo / freelance",
    description: "Contratos, presupuestos, propuestas y cartas para trabajar con clientes.",
    documents: ["contrato-freelance", "presupuesto-comercial", "propuesta-proyecto", "factura-proforma"],
  },
  {
    id: "empresa",
    label: "Pequeña empresa",
    description: "Documentos para clientes, proveedores, colaboraciones y gestión interna.",
    documents: ["prestacion-servicios-empresa", "acuerdo-colaboracion", "respuesta-reclamacion", "orden-compra"],
  },
  {
    id: "agencia",
    label: "Agencia / consultoría",
    description: "Propuestas, contratos digitales, mantenimiento y acuerdos con clientes.",
    documents: ["propuesta-proyecto", "contrato-desarrollo-web", "contrato-mantenimiento-web", "acuerdo-nda"],
  },
  {
    id: "rrhh",
    label: "RRHH / laboral",
    description: "Contratos, comunicaciones laborales, teletrabajo y bajas voluntarias.",
    documents: ["contrato-trabajo-indefinido", "contrato-temporal", "acuerdo-teletrabajo", "carta-renuncia"],
  },
  {
    id: "ecommerce",
    label: "Ecommerce / web",
    description: "Textos legales y operativos para publicar en una tienda o web.",
    documents: ["aviso-legal", "politica-privacidad", "politica-cookies", "politica-devoluciones", "politica-envios"],
  },
  {
    id: "legal",
    label: "Legal / operaciones",
    description: "Acuerdos, confidencialidad, compraventa, cesiones y documentos revisables.",
    documents: ["acuerdo-nda", "acuerdo-confidencialidad-ampliado", "cesion-derechos-pi", "compraventa-sencilla"],
  },
];

export function OnboardingChooser({ plan }: OnboardingChooserProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>("autonomo");
  const persona = personas.find((item) => item.id === selectedPersona) || personas[0];
  const isFree = plan === "free";
  const recommendedDocuments = useMemo(
    () => persona.documents.map((type) => getDocumentConfig(type)).filter((doc): doc is NonNullable<ReturnType<typeof getDocumentConfig>> => Boolean(doc)),
    [persona.documents],
  );
  const freeDocuments = recommendedDocuments.filter((doc) => !requiresPro(doc)).length;
  const proDocuments = recommendedDocuments.length - freeDocuments;
  const primaryDocument = recommendedDocuments.find((doc) => !isFree || !requiresPro(doc)) || recommendedDocuments[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
      <aside className="surface h-fit rounded-md p-4">
        <p className="eyebrow">Tu objetivo</p>
        <h2 className="font-serif-display mt-3 text-2xl font-bold">¿Qué necesitas preparar?</h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Elige el caso más parecido. No te encierra: solo ordena las recomendaciones para empezar más rápido.
        </p>
        <div className="mt-5 grid gap-2">
          {personas.map((item) => {
            const active = item.id === selectedPersona;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPersona(item.id)}
                className={`focus-ring rounded-md border px-4 py-3 text-left transition ${
                  active ? "border-[#2d6a4f] bg-[#d8f3dc]/72" : "border-[#d8f3dc] bg-[#fffdf8]/74 hover:border-[#2d6a4f]"
                }`}
              >
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="surface rounded-md p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-5">
          <div>
            <p className="eyebrow">Recomendados para ti</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">{persona.label}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{persona.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge badge-free">{freeDocuments} Free</span>
              {proDocuments > 0 && <span className="badge badge-pro">{proDocuments} Pro</span>}
            </div>
          </div>
          <Link href={primaryDocument ? `/generar?type=${primaryDocument.type}` : "/generar"} className="focus-ring btn-primary px-5 py-3 text-sm">
            Empezar con recomendado
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {recommendedDocuments.map((doc) => {
            const pro = requiresPro(doc);
            const locked = isFree && pro;

            return (
              <article key={doc.type} className="surface-flat interactive flex h-full flex-col rounded-md p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      pro ? "bg-[#2d6a4f] text-white" : "bg-[#d8f3dc] text-[#2d6a4f]"
                    }`}
                  >
                    {pro ? "Pro" : "Free"}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold">{doc.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{doc.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/${doc.type}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                    Ver ficha
                  </Link>
                  <Link
                    href={locked ? "/precios" : `/generar?type=${doc.type}`}
                    className={locked ? "focus-ring btn-secondary px-3 py-2 text-xs" : "focus-ring btn-primary px-3 py-2 text-xs"}
                  >
                    {locked ? "Desbloquear Pro" : "Crear ahora"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-slate-600">
              {isFree
                ? "Free te permite probar el flujo con catálogo base y 1 documento a medida al mes. Si necesitas Word, plantillas, asistente o uso recurrente, Pro es el siguiente paso natural."
                : "Tu plan permite generar documentos ilimitados, usar documentos Pro y trabajar con plantillas o marca personalizada."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/catalogo" className="focus-ring btn-ghost px-3 py-2 text-sm">
                Ver tipos
              </Link>
              {isFree && (
                <Link href="/precios" className="focus-ring btn-secondary px-3 py-2 text-sm">
                  Ver Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
