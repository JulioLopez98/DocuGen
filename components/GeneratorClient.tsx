"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { CustomDocumentForm, type CustomDocumentFormValues } from "@/components/CustomDocumentForm";
import { FormShell } from "@/components/forms/FormShell";
import { DocResult } from "@/components/DocResult";
import { documentTypes, getDefaultDocumentType, getDocumentConfig, requiresPro, type DocumentType } from "@/lib/document-types";
import type { PdfBrandSettings } from "@/lib/pdf";
import type { RefinementMode } from "@/lib/refinement";
import type { CommunityDocumentTypeRow, DocumentTemplateRow } from "@/lib/supabase-server";
import {
  defaultTemplateUsageMode,
  templateUsageDescriptions,
  templateUsageLabels,
  templateUsageModes,
  type TemplateUsageMode,
} from "@/lib/template-usage";

type GeneratedDocument = {
  id: string;
  docType: string;
  docLabel: string;
  content: string;
  formData: Record<string, string>;
};

type GenerateRequestPayload = {
  docType: string;
  formData: Record<string, string>;
  referenceTemplateId?: string | null;
  templateUsageMode?: TemplateUsageMode;
};

type TemplateOption = Pick<DocumentTemplateRow, "id" | "name" | "category" | "summary" | "created_at">;
type CommunityTypeOption = Pick<
  CommunityDocumentTypeRow,
  "id" | "label" | "description" | "category" | "required_plan" | "suggested_fields" | "status"
>;
type CommunityGeneratePayload = {
  communityTypeId: string;
  formData: Record<string, string>;
};

type GeneratorClientProps = {
  initialDocType?: DocumentType;
  initialFormData?: Record<string, string>;
  canExportDocx?: boolean;
  brandSettings?: PdfBrandSettings | null;
  plan?: "free" | "pro" | "empresa";
  referenceTemplates?: TemplateOption[];
  communityTypes?: CommunityTypeOption[];
  initialReferenceTemplateId?: string;
  initialMode?: "catalog" | "community" | "custom";
};

export function GeneratorClient({
  initialDocType,
  initialFormData,
  canExportDocx = false,
  brandSettings,
  plan = "free",
  referenceTemplates = [],
  communityTypes = [],
  initialReferenceTemplateId,
  initialMode = "catalog",
}: GeneratorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<DocumentType>(initialDocType || getDefaultDocumentType(searchParams.get("type")));
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [lastPayload, setLastPayload] = useState<GenerateRequestPayload | null>(
    initialFormData && initialDocType ? { docType: initialDocType, formData: initialFormData } : null,
  );
  const [lastCustomPayload, setLastCustomPayload] = useState<CustomDocumentFormValues | null>(null);
  const [lastCommunityPayload, setLastCommunityPayload] = useState<CommunityGeneratePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refiningMode, setRefiningMode] = useState<RefinementMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentQuery, setDocumentQuery] = useState("");
  const [generatorMode, setGeneratorMode] = useState<"catalog" | "community" | "custom">(initialMode);
  const [selectedCommunityId, setSelectedCommunityId] = useState(communityTypes[0]?.id || "");
  const [referenceTemplateId, setReferenceTemplateId] = useState(
    referenceTemplates.some((template) => template.id === initialReferenceTemplateId) ? initialReferenceTemplateId || "" : "",
  );
  const [templateUsageMode, setTemplateUsageMode] = useState<TemplateUsageMode>(defaultTemplateUsageMode);

  const config = getDocumentConfig(selected)!;
  const proLocked = plan === "free" && requiresPro(config);
  const customProLocked = plan === "free";
  const freeTypes = useMemo(() => documentTypes.filter((doc) => !requiresPro(doc)).length, []);
  const groupedDocuments = useMemo(() => groupDocumentTypes(documentQuery), [documentQuery]);
  const isTemplateMode = Boolean(initialFormData && initialDocType);
  const selectedReferenceTemplate = referenceTemplates.find((template) => template.id === referenceTemplateId);
  const selectedCommunityType = communityTypes.find((type) => type.id === selectedCommunityId);
  const communityLocked = selectedCommunityType ? !canUseCommunityType(plan, selectedCommunityType.required_plan) : false;

  function selectDocument(type: DocumentType) {
    setSelected(type);
    setGenerated(null);
    setError(null);
    setLastPayload(null);
    setLastCustomPayload(null);
    setLastCommunityPayload(null);
    router.replace(`/generar?type=${type}`, { scroll: false });
  }

  async function submitCustom(payload: CustomDocumentFormValues) {
    setLoading(true);
    setError(null);
    setLastPayload(null);
    setLastCommunityPayload(null);
    setLastCustomPayload(payload);

    try {
      const response = await fetch("/api/custom-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GeneratedDocument & { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo generar el documento a medida.");
        return;
      }

      setGenerated(data);
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setLoading(false);
    }
  }

  function regenerateGenerated() {
    if (!generated) {
      return;
    }

    if (generated.docType === "custom" && lastCustomPayload) {
      void submitCustom(lastCustomPayload);
      return;
    }

    if (generated.docType.startsWith("community:") && lastCommunityPayload) {
      void submitCommunity(lastCommunityPayload);
      return;
    }

    if (lastPayload) {
      void submit(lastPayload);
    }
  }

  async function submit(payload: { docType: string; formData: Record<string, string> }) {
    setLoading(true);
    setError(null);
    const requestPayload: GenerateRequestPayload = {
      ...payload,
      referenceTemplateId: referenceTemplateId || null,
      templateUsageMode,
    };
    setLastPayload(requestPayload);
    setLastCustomPayload(null);
    setLastCommunityPayload(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const data = (await response.json()) as GeneratedDocument & { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo generar el documento.");
        return;
      }

      setGenerated(data);
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCommunity(payload: CommunityGeneratePayload) {
    setLoading(true);
    setError(null);
    setLastCommunityPayload(payload);
    setLastPayload(null);
    setLastCustomPayload(null);

    try {
      const response = await fetch("/api/community-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as GeneratedDocument & { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo generar el documento comunitario.");
        return;
      }

      setGenerated(data);
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setLoading(false);
    }
  }

  async function refineGenerated(mode: RefinementMode) {
    if (!generated) {
      return;
    }

    setRefiningMode(mode);
    setError(null);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: generated.docType,
          formData: generated.formData,
          content: generated.content,
          mode,
        }),
      });
      const data = (await response.json()) as GeneratedDocument & { message?: string };

      if (!response.ok) {
        setError(data.message || "No se pudo crear la variante.");
        return;
      }

      setGenerated(data);
    } catch {
      setError("No se pudo conectar con el generador.");
    } finally {
      setRefiningMode(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[390px_1fr]">
      <aside className="space-y-4">
        <section className="surface rounded-md p-5">
          <div>
            <p className="eyebrow">Modo de creacion</p>
            <h2 className="font-serif-display mt-2 text-2xl font-bold">Elige el punto de partida</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Usa el catalogo si sabes lo que necesitas. Usa comunidad para tipos aprobados a partir de solicitudes.
              Usa a medida si no encuentras el documento exacto.
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => {
                setGeneratorMode("catalog");
                setGenerated(null);
                setError(null);
                router.replace("/generar?mode=catalog", { scroll: false });
              }}
              className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                generatorMode === "catalog" ? "border-[#2d6a4f] bg-[#d8f3dc]/70" : "border-[#d8f3dc] bg-white/70"
              }`}
            >
              <span className="font-bold">Catalogo guiado</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Tipos oficiales con formulario estructurado.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratorMode("community");
                setGenerated(null);
                setError(null);
                router.replace("/generar?mode=community", { scroll: false });
              }}
              disabled={communityTypes.length === 0}
              className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                generatorMode === "community" ? "border-[#2d6a4f] bg-[#d8f3dc]/70" : "border-[#d8f3dc] bg-white/70"
              }`}
            >
              <span className="font-bold">Catalogo comunitario</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Nuevos tipos revisados antes de publicarse.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratorMode("custom");
                setGenerated(null);
                setError(null);
                router.replace("/generar?mode=custom", { scroll: false });
              }}
              className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                generatorMode === "custom" ? "border-[#2d6a4f] bg-[#d8f3dc]/70" : "border-[#d8f3dc] bg-white/70"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                A medida
                {customProLocked && <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] text-white">Pro</span>}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Para documentos que no estan en el catalogo.</span>
            </button>
          </div>
        </section>

        {generatorMode === "catalog" && (
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
              <EmptyState
                eyebrow="Sin coincidencias"
                title="No encontramos ese documento"
                description="Prueba con una palabra mas general como contrato, web, carta o presupuesto."
                variant="flat"
                secondaryAction={{ href: "/catalogo", label: "Ver catalogo" }}
              />
            )}
          </div>
        </section>
        )}

        {generatorMode === "community" && (
          <section className="surface rounded-md p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Comunidad</p>
                <h2 className="font-serif-display mt-2 text-2xl font-bold">Tipos aprobados</h2>
              </div>
              <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                {communityTypes.length}
              </span>
            </div>
            <div className="mt-5 grid gap-2">
              {communityTypes.map((type) => {
                const active = type.id === selectedCommunityId;
                const locked = !canUseCommunityType(plan, type.required_plan);

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedCommunityId(type.id);
                      setGenerated(null);
                      setError(null);
                    }}
                    className={`focus-ring rounded-md border px-3 py-3 text-left transition ${
                      active
                        ? "border-[#2d6a4f] bg-[#d8f3dc]/70 shadow-sm"
                        : "border-transparent bg-white/70 hover:border-[#2d6a4f] hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                      {type.label}
                      <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        {locked ? type.required_plan : type.status}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {generatorMode === "catalog" && (
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
        )}

        {generatorMode === "catalog" && plan !== "free" && (
          <section className="surface-flat rounded-md p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Plantilla de referencia</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Usa una plantilla procesada para orientar estructura y tono. DocuGen no debe copiar datos concretos del archivo.
            </p>
            {referenceTemplates.length > 0 ? (
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Referencia</span>
                <select
                  value={referenceTemplateId}
                  onChange={(event) => setReferenceTemplateId(event.target.value)}
                  className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
                >
                  <option value="">Sin plantilla</option>
                  {referenceTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-[#d8f3dc] bg-white/70 p-4">
                <p className="text-sm font-semibold">No hay plantillas listas</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Sube y procesa una plantilla DOCX para usarla como referencia.
                </p>
                <Link href="/plantillas" className="focus-ring btn-ghost mt-3 px-3 py-2 text-xs">
                  Ir a plantillas
                </Link>
              </div>
            )}
            {selectedReferenceTemplate && (
              <div className="mt-4 rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">
                      {selectedReferenceTemplate.category || "Plantilla"}
                    </p>
                    <h3 className="mt-1 font-bold">{selectedReferenceTemplate.name}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {selectedReferenceTemplate.summary || "Sin resumen extraido."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Procesada el {new Date(selectedReferenceTemplate.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Link href={`/plantillas/${selectedReferenceTemplate.id}`} className="focus-ring btn-ghost px-3 py-2 text-xs">
                    Abrir
                  </Link>
                </div>
              </div>
            )}
            {selectedReferenceTemplate && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Como usarla</p>
                <div className="mt-2 grid gap-2">
                  {templateUsageModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTemplateUsageMode(mode)}
                      className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                        templateUsageMode === mode
                          ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                          : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
                      }`}
                    >
                      <span className="font-bold">{templateUsageLabels[mode]}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{templateUsageDescriptions[mode]}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 rounded-md bg-[#faf9f6] p-3 text-xs leading-5 text-slate-600">
                  Esta referencia orienta la estructura y el estilo. Los datos del formulario tienen prioridad y la IA
                  no debe reutilizar nombres, importes, fechas ni condiciones concretas de la plantilla.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="surface-flat rounded-md p-5">
          <p className="text-sm font-bold text-[#2d6a4f]">No encuentras tu documento?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Describe lo que necesitas y DocuGen generara un borrador personalizado. Disponible en Pro por su coste y complejidad.
          </p>
          <button
            type="button"
            onClick={() => {
              setGeneratorMode("custom");
              setGenerated(null);
              setError(null);
            }}
            className="focus-ring btn-ghost mt-4 px-3 py-2 text-sm"
          >
            Crear a medida
          </button>
        </section>
      </aside>

      <section className="surface rounded-md p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-5">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">
              {generatorMode === "catalog" ? config.category : generatorMode === "community" ? selectedCommunityType?.category || "Comunidad" : "Documento a medida"}
            </p>
            <h1 className="font-serif-display mt-1 text-3xl font-bold">
              {generatorMode === "catalog" ? config.label : generatorMode === "community" ? selectedCommunityType?.label || "Catálogo comunitario" : "No encuentro mi documento"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {generatorMode === "catalog"
                ? "Completa los datos principales. DocuGen no inventara informacion no aportada y usara marcadores si falta algo."
                : generatorMode === "community"
                  ? "Completa los campos sugeridos por una definición comunitaria aprobada por el equipo."
                  : "Explica que documento necesitas. Lo guardaremos como solicitud interna para detectar nuevos tipos utiles."}
            </p>
          </div>
          {loading && <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">Generando...</span>}
        </div>
        {generatorMode === "community" && selectedCommunityType && communityLocked ? (
          <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-6">
            <p className="eyebrow">Plan requerido</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Desbloquea {selectedCommunityType.label.toLowerCase()}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Este tipo comunitario requiere el plan {selectedCommunityType.required_plan}. Los documentos aprobados por la comunidad
              pueden tener instrucciones más avanzadas que los tipos gratuitos.
            </p>
            <Link href="/precios" className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm">
              Ver planes
            </Link>
          </div>
        ) : generatorMode === "community" && selectedCommunityType ? (
          <CommunityForm
            communityType={selectedCommunityType}
            disabled={loading}
            onSubmit={(formData) => submitCommunity({ communityTypeId: selectedCommunityType.id, formData })}
          />
        ) : generatorMode === "community" ? (
          <EmptyState
            eyebrow="Sin documentos comunitarios"
            title="Aún no hay tipos comunitarios disponibles"
            description="Cuando el equipo publique candidatos aprobados, aparecerán aquí para generar documentos."
            variant="flat"
          />
        ) : generatorMode === "custom" && customProLocked ? (
          <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-6">
            <p className="eyebrow">Funcion Pro</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Crea documentos que no estan en el catalogo</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              El modo a medida permite pedir documentos por escrito, con instrucciones libres, tono especifico y contexto propio.
              Lo reservamos para Pro porque usa prompts mas avanzados y tiene mayor coste de generacion.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                Desbloquear Pro
              </Link>
              <button type="button" onClick={() => setGeneratorMode("catalog")} className="focus-ring btn-secondary px-5 py-3 text-sm">
                Volver al catalogo
              </button>
            </div>
          </div>
        ) : generatorMode === "custom" ? (
          <CustomDocumentForm onSubmit={submitCustom} disabled={loading} />
        ) : proLocked ? (
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
            documentId={generated.id}
            docType={generated.docType === "custom" ? undefined : generated.docType}
            title={generated.docLabel}
            content={generated.content}
            includesSignatures={getDocumentConfig(generated.docType)?.includesSignatures ?? false}
            canExportDocx={canExportDocx}
            brandSettings={brandSettings}
            onRegenerate={regenerateGenerated}
            onRefine={getDocumentConfig(generated.docType) ? refineGenerated : undefined}
            refiningMode={refiningMode}
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

function CommunityForm({
  communityType,
  disabled,
  onSubmit,
}: {
  communityType: CommunityTypeOption;
  disabled: boolean;
  onSubmit: (formData: Record<string, string>) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formData);
      }}
    >
      <p className="rounded-md bg-[#faf9f6] p-3 text-sm leading-6 text-slate-600">{communityType.description}</p>
      {communityType.suggested_fields.map((field) => (
        <label key={field.name}>
          <span className="text-sm font-semibold">{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              value={formData[field.name] || ""}
              onChange={(event) => setFormData((current) => ({ ...current, [field.name]: event.target.value }))}
              rows={4}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
            />
          ) : (
            <input
              type={field.type === "email" || field.type === "date" ? field.type : "text"}
              value={formData[field.name] || ""}
              onChange={(event) => setFormData((current) => ({ ...current, [field.name]: event.target.value }))}
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
            />
          )}
        </label>
      ))}
      <p className="rounded-md bg-[#faf9f6] p-3 text-xs leading-5 text-slate-600">
        Este tipo procede del catálogo comunitario revisado. El resultado sigue siendo un borrador generado con IA.
      </p>
      <button type="submit" disabled={disabled} className="focus-ring btn-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
        {disabled ? "Generando..." : "Generar documento comunitario"}
      </button>
    </form>
  );
}

function canUseCommunityType(userPlan: "free" | "pro" | "empresa", requiredPlan: "free" | "pro" | "empresa") {
  const rank = {
    free: 0,
    pro: 1,
    empresa: 2,
  };

  return rank[userPlan] >= rank[requiredPlan];
}
