"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { CustomDocumentForm, type CustomDocumentFormValues } from "@/components/CustomDocumentForm";
import { FormShell } from "@/components/forms/FormShell";
import { DocResult, type DocumentTemplateTrace } from "@/components/DocResult";
import { documentTypes, getDefaultDocumentType, getDocumentConfig, requiresPro, type DocumentType } from "@/lib/document-types";
import type { PdfBrandSettings } from "@/lib/pdf";
import type { RefinementMode } from "@/lib/refinement";
import type { CommunityDocumentTypeRow, DocumentTemplateRow, WorkspaceRow } from "@/lib/supabase-server";
import { getTemplateUsageMetrics, type TemplateUsageMetricsMap } from "@/lib/template-metrics";
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
  templateTrace?: DocumentTemplateTrace | null;
};

type GenerateRequestPayload = {
  docType: string;
  formData: Record<string, string>;
  workspaceId?: string | null;
  referenceTemplateId?: string | null;
  templateUsageMode?: TemplateUsageMode;
};

type TemplateOption = Pick<DocumentTemplateRow, "id" | "name" | "category" | "summary" | "created_at" | "is_favorite" | "workspace_id">;
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
  referenceTemplateMetrics?: TemplateUsageMetricsMap;
  workspaces?: WorkspaceRow[];
  communityTypes?: CommunityTypeOption[];
  initialReferenceTemplateId?: string;
  initialTemplateUsageMode?: TemplateUsageMode;
  initialMode?: "catalog" | "community" | "custom";
};

type GeneratorIntentId = "popular" | "sell" | "hire" | "protect" | "web" | "claim" | "operations" | "home" | "all";

type GeneratorIntent = {
  id: GeneratorIntentId;
  label: string;
  description: string;
  categories?: string[];
  types?: DocumentType[];
  keywords?: string[];
  sampleTypes: DocumentType[];
};

const generatorIntents: GeneratorIntent[] = [
  {
    id: "popular",
    label: "Lo mas habitual",
    description: "Empieza por los documentos que mas suelen necesitar autonomos, empresas y profesionales.",
    types: ["contrato-freelance", "presupuesto-comercial", "propuesta-proyecto", "carta-presentacion", "aviso-legal"],
    sampleTypes: ["contrato-freelance", "presupuesto-comercial", "carta-presentacion"],
  },
  {
    id: "sell",
    label: "Vender o presentar una propuesta",
    description: "Presupuestos, propuestas, pedidos y condiciones para trabajar con clientes.",
    categories: ["Comercial"],
    keywords: ["venta", "presupuesto", "propuesta", "pedido", "albaran"],
    sampleTypes: ["presupuesto-comercial", "propuesta-proyecto", "condiciones-generales-venta"],
  },
  {
    id: "hire",
    label: "Contratar o colaborar",
    description: "Contratos, acuerdos de colaboracion y documentos para definir una relacion profesional.",
    categories: ["Laboral", "Laboral y servicios", "Empresa"],
    keywords: ["contrato", "acuerdo", "servicios", "colaboracion", "teletrabajo"],
    sampleTypes: ["contrato-freelance", "acuerdo-colaboracion", "prestacion-servicios-empresa"],
  },
  {
    id: "protect",
    label: "Proteger informacion o derechos",
    description: "Confidencialidad, propiedad intelectual, pactos y documentos con mayor sensibilidad legal.",
    categories: ["Legal"],
    keywords: ["nda", "confidencialidad", "derechos", "arras", "compraventa"],
    sampleTypes: ["acuerdo-nda", "acuerdo-confidencialidad-ampliado", "cesion-derechos-pi"],
  },
  {
    id: "web",
    label: "Web, privacidad y ecommerce",
    description: "Textos para webs, privacidad, cookies, devoluciones, envios y servicios digitales.",
    categories: ["Web", "Digital"],
    keywords: ["web", "privacidad", "cookies", "devoluciones", "envios"],
    sampleTypes: ["aviso-legal", "politica-privacidad", "politica-cookies"],
  },
  {
    id: "claim",
    label: "Reclamar o responder",
    description: "Cartas y emails formales para reclamar, contestar o dejar constancia por escrito.",
    categories: ["Profesional"],
    keywords: ["reclamacion", "respuesta", "carta", "renuncia", "certificado"],
    sampleTypes: ["reclamacion-formal-email", "carta-reclamacion-empresa", "respuesta-reclamacion"],
  },
  {
    id: "operations",
    label: "Gestion interna",
    description: "Documentos operativos para reuniones, compras, entregas y procesos del dia a dia.",
    categories: ["Profesional", "Comercial", "Empresa"],
    keywords: ["acta", "orden", "albaran", "certificado", "factura"],
    sampleTypes: ["acta-reunion", "orden-compra", "factura-proforma"],
  },
  {
    id: "home",
    label: "Inmuebles",
    description: "Documentos para operaciones sencillas relacionadas con locales, arras e inventarios.",
    categories: ["Inmobiliario"],
    keywords: ["arrendamiento", "arras", "inmueble", "local"],
    sampleTypes: ["arrendamiento-local", "contrato-arras", "inventario-inmueble"],
  },
  {
    id: "all",
    label: "Todo el catalogo",
    description: "Explora todos los tipos oficiales de DocuGen por categoria.",
    sampleTypes: ["contrato-freelance", "presupuesto-comercial", "politica-privacidad"],
  },
];

export function GeneratorClient({
  initialDocType,
  initialFormData,
  canExportDocx = false,
  brandSettings,
  plan = "free",
  referenceTemplates = [],
  referenceTemplateMetrics = {},
  workspaces = [],
  communityTypes = [],
  initialReferenceTemplateId,
  initialTemplateUsageMode,
  initialMode = "catalog",
}: GeneratorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSelectedType = initialDocType || getDefaultDocumentType(searchParams.get("type"));
  const [selected, setSelected] = useState<DocumentType>(initialSelectedType);
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
  const [selectedIntentId, setSelectedIntentId] = useState<GeneratorIntentId>(() => getIntentForDocument(initialSelectedType));
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateView, setTemplateView] = useState<"all" | "favorites" | "used" | "recent">("all");
  const [generatorMode, setGeneratorMode] = useState<"catalog" | "community" | "custom">(initialMode);
  const [selectedCommunityId, setSelectedCommunityId] = useState(communityTypes[0]?.id || "");
  const [referenceTemplateId, setReferenceTemplateId] = useState(
    referenceTemplates.some((template) => template.id === initialReferenceTemplateId) ? initialReferenceTemplateId || "" : "",
  );
  const [workspaceId, setWorkspaceId] = useState("");
  const [templateUsageMode, setTemplateUsageMode] = useState<TemplateUsageMode>(initialTemplateUsageMode || defaultTemplateUsageMode);

  const config = getDocumentConfig(selected)!;
  const proLocked = plan === "free" && requiresPro(config);
  const customProLocked = plan === "free";
  const freeTypes = useMemo(() => documentTypes.filter((doc) => !requiresPro(doc)).length, []);
  const groupedDocuments = useMemo(() => groupDocumentTypes(documentQuery, selectedIntentId), [documentQuery, selectedIntentId]);
  const visibleDocumentCount = useMemo(
    () => groupedDocuments.reduce((total, group) => total + group.documents.length, 0),
    [groupedDocuments],
  );
  const selectedIntent = generatorIntents.find((intent) => intent.id === selectedIntentId) || generatorIntents[0];
  const visibleReferenceTemplates = useMemo(
    () => filterAndRankReferenceTemplates(referenceTemplates, referenceTemplateMetrics, templateQuery, templateView, workspaceId || null),
    [referenceTemplates, referenceTemplateMetrics, templateQuery, templateView, workspaceId],
  );
  const recommendedReferenceTemplates = useMemo(
    () =>
      getRecommendedReferenceTemplates(
        referenceTemplates.filter((template) =>
          workspaceId ? template.workspace_id === workspaceId || template.workspace_id === null : template.workspace_id === null,
        ),
        referenceTemplateMetrics,
        config.category,
      ),
    [referenceTemplates, referenceTemplateMetrics, config.category, workspaceId],
  );
  const isTemplateMode = Boolean(initialFormData && initialDocType);
  const selectedReferenceTemplate = referenceTemplates.find((template) => template.id === referenceTemplateId);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);
  const selectedCommunityType = communityTypes.find((type) => type.id === selectedCommunityId);
  const communityLocked = selectedCommunityType ? !canUseCommunityType(plan, selectedCommunityType.required_plan) : false;
  const isFreePlan = plan === "free";

  function selectCatalogIntent(intentId: GeneratorIntentId) {
    const matchingDocuments = getDocumentsForIntent(intentId);
    const nextSelected = matchingDocuments.some((doc) => doc.type === selected) ? selected : matchingDocuments[0]?.type || selected;

    setGeneratorMode("catalog");
    setSelectedIntentId(intentId);
    setGenerated(null);
    setError(null);

    if (nextSelected !== selected) {
      setSelected(nextSelected);
      setLastPayload(null);
      setLastCustomPayload(null);
      setLastCommunityPayload(null);
    }

    router.replace(`/generar?mode=catalog&type=${nextSelected}`, { scroll: false });
  }

  function selectDocument(type: DocumentType) {
    setSelected(type);
    setSelectedIntentId(getIntentForDocument(type));
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
      workspaceId: workspaceId || null,
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

      setGenerated({ ...data, templateTrace: generated.templateTrace || null });
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
            <p className="eyebrow">Punto de partida</p>
            <h2 className="font-serif-display mt-2 text-2xl font-bold">Que quieres crear?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Primero elige la intencion. Despues veras solo los documentos que encajan, sin tener que recorrer todo el catalogo.
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            {generatorIntents.filter((intent) => intent.id !== "all").map((intent) => (
              <button
                key={intent.id}
                type="button"
                onClick={() => selectCatalogIntent(intent.id)}
                className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                  generatorMode === "catalog" && selectedIntentId === intent.id
                    ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                    : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-bold">{intent.label}</span>
                  <span className="text-xs font-semibold text-[#2d6a4f]">{getDocumentsForIntent(intent.id).length}</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{intent.description}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-[#d8f3dc] pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Tambien puedes</p>
            <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => {
                setGeneratorMode("catalog");
                setSelectedIntentId("all");
                setGenerated(null);
                setError(null);
                router.replace("/generar?mode=catalog", { scroll: false });
              }}
              className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                generatorMode === "catalog" && selectedIntentId === "all"
                  ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                  : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
              }`}
            >
              <span className="font-bold">Ver todo el catalogo</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Todos los tipos oficiales disponibles.</span>
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
              <span className="font-bold">Tipos de la comunidad</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Documentos aprobados a partir de solicitudes reales.</span>
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
                Pedir un documento a medida
                {customProLocked && <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] text-white">Pro</span>}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Para documentos que no estan en el catalogo.</span>
            </button>
            </div>
          </div>
        </section>

        {workspaces.length > 0 && (
          <section className="surface-flat rounded-md p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Espacio de trabajo</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Decide si el documento queda solo en tu historial personal o compartido con un workspace.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Guardar en</span>
              <select
                value={workspaceId}
                onChange={(event) => {
                  setWorkspaceId(event.target.value);
                  setReferenceTemplateId("");
                }}
                className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
              >
                <option value="">Personal</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedWorkspace && (
              <p className="mt-3 rounded-md bg-white/75 p-3 text-xs leading-5 text-slate-600">
                El documento sera visible para miembros de {selectedWorkspace.name}.
              </p>
            )}
          </section>
        )}

        <section className="surface-flat rounded-md p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#2d6a4f]">Tu plan</p>
            <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold uppercase text-[#2d6a4f]">{plan}</span>
          </div>
          <div className="mt-4 grid gap-2 text-sm">
            <InfoPill label="Generaciones" value={isFreePlan ? "3 al mes" : "Ilimitadas"} />
            <InfoPill label="Word" value={canExportDocx ? "Incluido" : "Solo Pro"} />
            <InfoPill label="A medida" value={isFreePlan ? "Solo Pro" : "Incluido"} />
            <InfoPill label="Plantillas" value={isFreePlan ? "Solo Pro" : "Incluidas"} />
          </div>
          {isFreePlan && (
            <Link href="/precios" className="focus-ring btn-primary mt-4 w-full px-4 py-3 text-center text-sm">
              Ver que desbloquea Pro
            </Link>
          )}
        </section>

        {generatorMode === "catalog" && (
        <section className="surface rounded-md p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Documento</p>
              <h2 className="font-serif-display mt-2 text-2xl font-bold">{selectedIntent.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedIntent.description}</p>
            </div>
            <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{visibleDocumentCount} tipos</span>
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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Sugerencia:</span>
            {selectedIntent.sampleTypes.map((type) => {
              const sampleConfig = getDocumentConfig(type);

              if (!sampleConfig) {
                return null;
              }

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectDocument(type)}
                  className="focus-ring rounded-full border border-[#d8f3dc] bg-white/75 px-3 py-1 font-semibold text-[#2d6a4f] transition hover:border-[#2d6a4f]"
                >
                  {sampleConfig.label}
                </button>
              );
            })}
          </div>

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
              Has cargado datos desde el historial
              {selectedReferenceTemplate
                ? ` y se ha recuperado la plantilla "${selectedReferenceTemplate.name}" con el modo ${templateUsageLabels[templateUsageMode]}.`
                : "."}
            </p>
          )}
        </section>
        )}

        {generatorMode === "catalog" && plan !== "free" && (
          <section className="surface-flat rounded-md p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#2d6a4f]">Plantilla de referencia</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Opcional: usa una plantilla propia para orientar estructura y tono sin copiar datos concretos.
                </p>
              </div>
              <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">
                {referenceTemplates.length} listas
              </span>
            </div>
            {referenceTemplates.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {recommendedReferenceTemplates.length > 0 && (
                  <div className="rounded-md border border-[#2d6a4f] bg-[#f4fbf5] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Recomendadas</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Sugeridas por uso, favoritas, recencia y afinidad con {config.category.toLowerCase()}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateView("all");
                          setTemplateQuery("");
                        }}
                        className="focus-ring btn-ghost px-3 py-2 text-xs"
                      >
                        Ver todas
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {recommendedReferenceTemplates.map((recommendation) => (
                        <button
                          key={recommendation.template.id}
                          type="button"
                          onClick={() => setReferenceTemplateId(recommendation.template.id)}
                          className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                            referenceTemplateId === recommendation.template.id
                              ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                              : "border-[#d8f3dc] bg-white/75 hover:border-[#2d6a4f]"
                          }`}
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{recommendation.template.name}</span>
                            <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">
                              {recommendation.reason}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {recommendation.template.category || "Sin categoria"} | {recommendation.metrics.totalUses} usos |{" "}
                            {formatDateOrNever(recommendation.metrics.lastUsedAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <label>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar plantilla</span>
                  <input
                    value={templateQuery}
                    onChange={(event) => setTemplateQuery(event.target.value)}
                    className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white/90 px-3 py-3 text-sm transition focus:border-[#2d6a4f]"
                    placeholder="Nombre, categoria o resumen..."
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["all", "favorites", "used", "recent"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setTemplateView(view)}
                      className={`focus-ring rounded-md border px-3 py-2 text-left text-xs font-semibold transition ${
                        templateView === view
                          ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                          : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
                      }`}
                    >
                      {getTemplateViewLabel(view)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setReferenceTemplateId("")}
                  className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                    !referenceTemplateId ? "border-[#2d6a4f] bg-[#d8f3dc]/70" : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
                  }`}
                >
                  <span className="font-bold">Sin plantilla</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Genera solo con el formulario y las reglas de DocuGen.
                  </span>
                </button>
                {visibleReferenceTemplates.slice(0, 8).map((template) => {
                  const metrics = getTemplateUsageMetrics(referenceTemplateMetrics, template.id);

                  return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setReferenceTemplateId(template.id)}
                    className={`focus-ring rounded-md border px-3 py-3 text-left text-sm transition ${
                      referenceTemplateId === template.id
                        ? "border-[#2d6a4f] bg-[#d8f3dc]/70"
                        : "border-[#d8f3dc] bg-white/70 hover:border-[#2d6a4f]"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{template.name}</span>
                          {template.is_favorite && (
                            <span className="rounded-full bg-[#1f2933] px-2 py-0.5 text-[10px] font-bold text-white">Destacada</span>
                          )}
                          {metrics.totalUses > 0 && (
                            <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">
                              {metrics.totalUses} usos
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {template.category || "Sin categoria"} · {new Date(template.created_at).toLocaleDateString("es-ES")}
                        </span>
                      </span>
                      <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">Lista</span>
                    </span>
                    {template.summary && (
                      <span className="mt-2 block max-h-10 overflow-hidden text-xs leading-5 text-slate-500">{template.summary}</span>
                    )}
                    <span className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <span className="rounded-md bg-white/75 px-3 py-2">Ultimo uso: {formatDateOrNever(metrics.lastUsedAt)}</span>
                      <span className="rounded-md bg-white/75 px-3 py-2">Modo: {formatUsageMode(metrics.mostUsedMode)}</span>
                    </span>
                  </button>
                  );
                })}
                {visibleReferenceTemplates.length === 0 && (
                  <div className="rounded-md border border-dashed border-[#d8f3dc] bg-white/70 p-4">
                    <p className="text-sm font-semibold">No hay plantillas con esos filtros</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Prueba con otra busqueda o cambia la vista.</p>
                  </div>
                )}
                {referenceTemplates.length > 8 && (
                  <Link href="/plantillas" className="focus-ring btn-ghost px-3 py-2 text-xs">
                    Ver todas las plantillas
                  </Link>
                )}
              </div>
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
              <div className="mt-4 rounded-md border border-[#2d6a4f] bg-[#f4fbf5] p-4">
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
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <span className="rounded-md bg-white/75 px-3 py-2">Estructura: opcional</span>
                  <span className="rounded-md bg-white/75 px-3 py-2">Tono: opcional</span>
                  <span className="rounded-md bg-white/75 px-3 py-2">Datos: no se copian</span>
                </div>
              </div>
            )}
            {selectedReferenceTemplate && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Como usarla</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
                      <span className="font-bold">{getTemplateUsageDecisionLabel(mode)}</span>
                      <span className="mt-1 block text-xs font-semibold text-[#2d6a4f]">{templateUsageLabels[mode]}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{templateUsageDescriptions[mode]}</span>
                    </button>
                  ))}
                </div>
                <TemplateInfluencePreview
                  mode={templateUsageMode}
                  templateName={selectedReferenceTemplate.name}
                  templateCategory={selectedReferenceTemplate.category}
                  templateSummary={selectedReferenceTemplate.summary}
                />
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
            templateTrace={generated.templateTrace || null}
            onRegenerate={regenerateGenerated}
            onRefine={getDocumentConfig(generated.docType) ? refineGenerated : undefined}
            refiningMode={refiningMode}
          />
        </div>
      )}
    </div>
  );
}

function groupDocumentTypes(query: string, intentId: GeneratorIntentId) {
  const groups = new Map<string, typeof documentTypes[number][]>();
  const normalizedQuery = query.trim().toLowerCase();

  for (const doc of documentTypes) {
    const searchable = `${doc.label} ${doc.summary} ${doc.category}`.toLowerCase();

    if (!documentMatchesIntent(doc, intentId)) {
      continue;
    }

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

function getDocumentsForIntent(intentId: GeneratorIntentId) {
  return documentTypes.filter((doc) => documentMatchesIntent(doc, intentId));
}

function documentMatchesIntent(doc: typeof documentTypes[number], intentId: GeneratorIntentId) {
  if (intentId === "all") {
    return true;
  }

  const intent = generatorIntents.find((item) => item.id === intentId);

  if (!intent) {
    return true;
  }

  if (intent.types?.includes(doc.type)) {
    return true;
  }

  if (intent.categories?.includes(doc.category)) {
    return true;
  }

  if (intent.keywords?.some((keyword) => normalizeForMatch(`${doc.label} ${doc.summary}`).includes(normalizeForMatch(keyword)))) {
    return true;
  }

  return false;
}

function getIntentForDocument(type: DocumentType): GeneratorIntentId {
  const exactIntent = generatorIntents.find((intent) => intent.id !== "all" && intent.types?.includes(type));

  if (exactIntent) {
    return exactIntent.id;
  }

  const config = getDocumentConfig(type);

  if (!config) {
    return "popular";
  }

  const categoryIntent = generatorIntents.find(
    (intent) => intent.id !== "all" && intent.categories?.includes(config.category),
  );

  return categoryIntent?.id || "all";
}

function filterAndRankReferenceTemplates(
  templates: TemplateOption[],
  metricsMap: TemplateUsageMetricsMap,
  query: string,
  view: "all" | "favorites" | "used" | "recent",
  workspaceId: string | null,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return templates
    .filter((template) => {
      const metrics = getTemplateUsageMetrics(metricsMap, template.id);
      const searchable = `${template.name} ${template.category || ""} ${template.summary || ""}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesScope = workspaceId ? template.workspace_id === workspaceId || template.workspace_id === null : template.workspace_id === null;
      const matchesView =
        view === "all" ||
        (view === "favorites" && template.is_favorite) ||
        (view === "used" && metrics.totalUses > 0) ||
        view === "recent";

      return matchesQuery && matchesView && matchesScope;
    })
    .sort((first, second) => {
      const firstMetrics = getTemplateUsageMetrics(metricsMap, first.id);
      const secondMetrics = getTemplateUsageMetrics(metricsMap, second.id);

      if (view === "recent") {
        return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
      }

      if (first.is_favorite !== second.is_favorite) {
        return first.is_favorite ? -1 : 1;
      }

      if (firstMetrics.totalUses !== secondMetrics.totalUses) {
        return secondMetrics.totalUses - firstMetrics.totalUses;
      }

      const firstLastUsed = firstMetrics.lastUsedAt ? new Date(firstMetrics.lastUsedAt).getTime() : 0;
      const secondLastUsed = secondMetrics.lastUsedAt ? new Date(secondMetrics.lastUsedAt).getTime() : 0;

      if (firstLastUsed !== secondLastUsed) {
        return secondLastUsed - firstLastUsed;
      }

      return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
    });
}

function getRecommendedReferenceTemplates(
  templates: TemplateOption[],
  metricsMap: TemplateUsageMetricsMap,
  documentCategory: string,
) {
  return templates
    .map((template) => {
      const metrics = getTemplateUsageMetrics(metricsMap, template.id);
      const categoryMatch = isCategoryMatch(template.category, documentCategory);
      const score =
        (template.is_favorite ? 80 : 0) +
        Math.min(metrics.totalUses * 12, 60) +
        (categoryMatch ? 35 : 0) +
        getRecencyScore(metrics.lastUsedAt || template.created_at);

      return {
        template,
        metrics,
        score,
        reason: getRecommendationReason(template, metrics, categoryMatch),
      };
    })
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);
}

function isCategoryMatch(templateCategory: string | null, documentCategory: string) {
  if (!templateCategory) {
    return false;
  }

  const normalizedTemplate = normalizeForMatch(templateCategory);
  const normalizedDocument = normalizeForMatch(documentCategory);

  return normalizedTemplate.includes(normalizedDocument) || normalizedDocument.includes(normalizedTemplate);
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getRecencyScore(value: string | null) {
  if (!value) {
    return 0;
  }

  const ageDays = Math.max((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24), 0);

  if (ageDays <= 7) {
    return 20;
  }

  if (ageDays <= 30) {
    return 12;
  }

  if (ageDays <= 90) {
    return 6;
  }

  return 1;
}

function getRecommendationReason(
  template: TemplateOption,
  metrics: ReturnType<typeof getTemplateUsageMetrics>,
  categoryMatch: boolean,
) {
  if (template.is_favorite) {
    return "Destacada";
  }

  if (metrics.totalUses > 0) {
    return "Mas usada";
  }

  if (categoryMatch) {
    return "Categoria similar";
  }

  return "Reciente";
}

function getTemplateViewLabel(view: "all" | "favorites" | "used" | "recent") {
  const labels = {
    all: "Todas",
    favorites: "Destacadas",
    used: "Usadas",
    recent: "Recientes",
  };

  return labels[view];
}

function formatDateOrNever(value: string | null) {
  if (!value) {
    return "Sin uso";
  }

  return new Date(value).toLocaleDateString("es-ES");
}

function formatUsageMode(mode: ReturnType<typeof getTemplateUsageMetrics>["mostUsedMode"]) {
  if (!mode) {
    return "Sin datos";
  }

  return templateUsageLabels[mode];
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-white/72 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-[#1f2933]">{value}</span>
    </div>
  );
}

function getTemplateUsageDecisionLabel(mode: TemplateUsageMode) {
  if (mode === "structure_tone") {
    return "Quiero que se parezca bastante";
  }

  if (mode === "structure") {
    return "Quiero su orden de apartados";
  }

  if (mode === "tone") {
    return "Quiero su forma de escribir";
  }

  return "Solo quiero una referencia suave";
}

function TemplateInfluencePreview({
  mode,
  templateName,
  templateCategory,
  templateSummary,
}: {
  mode: TemplateUsageMode;
  templateName: string;
  templateCategory: string | null;
  templateSummary: string | null;
}) {
  const preview = getTemplateInfluencePreview(mode);

  return (
    <div className="mt-4 rounded-md border border-[#2d6a4f] bg-[#f4fbf5] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Vista previa de influencia</p>
          <h3 className="mt-2 font-bold">{preview.title}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            DocuGen usara <strong>{templateName}</strong>
            {templateCategory ? ` (${templateCategory})` : ""} como referencia, sin convertirla en una copia literal.
          </p>
        </div>
        <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{preview.weight}</span>
      </div>

      {templateSummary && (
        <p className="mt-3 rounded-md bg-white/75 p-3 text-xs leading-5 text-slate-600">
          Resumen detectado: {templateSummary}
        </p>
      )}

      <div className="mt-4 grid gap-3">
        <InfluenceRow label="Estructura" value={preview.structure} active={preview.structureActive} />
        <InfluenceRow label="Tono" value={preview.tone} active={preview.toneActive} />
        <InfluenceRow label="Contenido" value={preview.content} active={false} />
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-600">
        {preview.rules.map((rule) => (
          <p key={rule} className="rounded-md bg-white/75 px-3 py-2">
            {rule}
          </p>
        ))}
      </div>
    </div>
  );
}

function InfluenceRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-white/75 px-3 py-2 text-xs">
      <div>
        <p className="font-bold text-[#1f2933]">{label}</p>
        <p className="mt-1 leading-5 text-slate-600">{value}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active ? "bg-[#d8f3dc] text-[#2d6a4f]" : "bg-[#faf9f6] text-slate-500"
        }`}
      >
        {active ? "Influye" : "Limitado"}
      </span>
    </div>
  );
}

function getTemplateInfluencePreview(mode: TemplateUsageMode) {
  if (mode === "structure_tone") {
    return {
      title: "Influencia alta, sin copiar datos",
      weight: "Alta",
      structure: "Se respetara el orden general de apartados, jerarquia y ritmo del documento original.",
      tone: "Se imitara el estilo profesional, nivel de formalidad y forma de presentar condiciones.",
      content: "No se reutilizaran nombres, importes, fechas, clientes, clausulas particulares ni datos sensibles.",
      structureActive: true,
      toneActive: true,
      rules: [
        "Ideal cuando quieres que el nuevo documento se parezca bastante al formato de tu empresa.",
        "Los campos que rellenes en el formulario tienen prioridad sobre cualquier referencia de la plantilla.",
      ],
    };
  }

  if (mode === "structure") {
    return {
      title: "Influencia centrada en el esqueleto",
      weight: "Media",
      structure: "Se usara la plantilla como mapa de secciones y orden de lectura.",
      tone: "El tono seguira el estilo base de DocuGen, no el de la plantilla.",
      content: "La plantilla no aportara condiciones concretas salvo como orientacion estructural.",
      structureActive: true,
      toneActive: false,
      rules: [
        "Recomendado si te gusta la organizacion del documento, pero no quieres imitar su redaccion.",
        "Si falta informacion, se marcaran campos como [PENDIENTE DE COMPLETAR].",
      ],
    };
  }

  if (mode === "tone") {
    return {
      title: "Influencia centrada en estilo y voz",
      weight: "Media",
      structure: "La estructura dependera del tipo documental elegido, no del orden de la plantilla.",
      tone: "Se tendra en cuenta la formalidad, claridad, longitud de frases y estilo general.",
      content: "No se copiara el contenido material de la plantilla ni sus datos concretos.",
      structureActive: false,
      toneActive: true,
      rules: [
        "Util para mantener una voz de marca o una forma de escribir reconocible.",
        "El resultado puede tener apartados distintos si el documento elegido lo requiere.",
      ],
    };
  }

  return {
    title: "Referencia suave",
    weight: "Baja",
    structure: "La estructura seguira principalmente el tipo de documento seleccionado.",
    tone: "El tono de la plantilla solo servira como inspiracion ligera.",
    content: "La IA priorizara el formulario y las reglas de DocuGen por encima de la plantilla.",
    structureActive: false,
    toneActive: false,
    rules: [
      "Buena opcion cuando quieres evitar que la plantilla condicione demasiado el resultado.",
      "Mantiene el valor de referencia sin arrastrar formulas demasiado especificas.",
    ],
  };
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
