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
import type { TemplateUsageMetricsMap } from "@/lib/template-metrics";
import { defaultTemplateUsageMode, type TemplateUsageMode } from "@/lib/template-usage";

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
  "id" | "label" | "description" | "category" | "required_plan" | "prompt_brief" | "suggested_fields" | "status" | "created_at"
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
  initialCommunityTypeId?: string;
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
    label: "Lo más habitual",
    description: "Empieza por los documentos que más suelen necesitar autónomos, empresas y profesionales.",
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
    description: "Contratos, acuerdos de colaboración y documentos para definir una relación profesional.",
    categories: ["Laboral", "Laboral y servicios", "Empresa"],
    keywords: ["contrato", "acuerdo", "servicios", "colaboracion", "teletrabajo"],
    sampleTypes: ["contrato-freelance", "acuerdo-colaboracion", "prestacion-servicios-empresa"],
  },
  {
    id: "protect",
    label: "Proteger información o derechos",
    description: "Confidencialidad, propiedad intelectual, pactos y documentos con mayor sensibilidad legal.",
    categories: ["Legal"],
    keywords: ["nda", "confidencialidad", "derechos", "arras", "compraventa"],
    sampleTypes: ["acuerdo-nda", "acuerdo-confidencialidad-ampliado", "cesion-derechos-pi"],
  },
  {
    id: "web",
    label: "Web, privacidad y ecommerce",
    description: "Textos para webs, privacidad, cookies, devoluciones, envíos y servicios digitales.",
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
    label: "Gestión interna",
    description: "Documentos operativos para reuniones, compras, entregas y procesos del día a día.",
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
    label: "Todos los tipos",
    description: "Explora todos los tipos oficiales de DocuGen por categoría.",
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
  communityTypes = [],
  initialReferenceTemplateId,
  initialTemplateUsageMode,
  initialMode = "catalog",
  initialCommunityTypeId,
}: GeneratorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSelectedType = initialDocType || getDefaultDocumentType(searchParams.get("type"));
  const startsWithExplicitDocument = Boolean(initialDocType || initialFormData || searchParams.get("type"));
  const initialIntentId =
    getValidIntentId(searchParams.get("intent")) || (startsWithExplicitDocument ? getIntentForDocument(initialSelectedType) : "all");
  const [selected, setSelected] = useState<DocumentType>(initialSelectedType);
  const [selectedDocumentConfirmed, setSelectedDocumentConfirmed] = useState(startsWithExplicitDocument);
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
  const [selectedIntentId, setSelectedIntentId] = useState<GeneratorIntentId>(initialIntentId);
  const [generatorMode, setGeneratorMode] = useState<"catalog" | "community" | "custom">(initialMode);
  const [personalCatalogTypes, setPersonalCatalogTypes] = useState(communityTypes);
  const initialCommunityTypeExists = Boolean(initialCommunityTypeId && communityTypes.some((type) => type.id === initialCommunityTypeId));
  const [selectedCommunityId, setSelectedCommunityId] = useState(initialCommunityTypeExists ? initialCommunityTypeId || "" : communityTypes[0]?.id || "");
  const [communityTypeConfirmed, setCommunityTypeConfirmed] = useState(initialMode === "community" && initialCommunityTypeExists);
  const referenceTemplateId = referenceTemplates.some((template) => template.id === initialReferenceTemplateId) ? initialReferenceTemplateId || "" : "";
  const workspaceId = "";
  const templateUsageMode = initialTemplateUsageMode || defaultTemplateUsageMode;

  const config = getDocumentConfig(selected)!;
  const proLocked = plan === "free" && requiresPro(config);
  const customProLocked = plan === "free";
  const groupedDocuments = useMemo(() => groupDocumentTypes(documentQuery, selectedIntentId), [documentQuery, selectedIntentId]);
  const selectedIntent = generatorIntents.find((intent) => intent.id === selectedIntentId) || generatorIntents[0];
  const selectedCommunityType = personalCatalogTypes.find((type) => type.id === selectedCommunityId);
  const communityLocked = selectedCommunityType ? !canUseCommunityType(plan, selectedCommunityType.required_plan) : false;

  function selectCatalogIntent(intentId: GeneratorIntentId) {
    const matchingDocuments = getDocumentsForIntent(intentId);
    const nextSelected = matchingDocuments.some((doc) => doc.type === selected) ? selected : matchingDocuments[0]?.type || selected;

    setGeneratorMode("catalog");
    setCommunityTypeConfirmed(false);
    setSelectedIntentId(intentId);
    setSelectedDocumentConfirmed(false);
    setGenerated(null);
    setError(null);
    setLastPayload(null);
    setLastCustomPayload(null);
    setLastCommunityPayload(null);

    if (nextSelected !== selected) {
      setSelected(nextSelected);
    }

    router.replace(`/generar?mode=catalog&intent=${intentId}`, { scroll: false });
  }

  function selectDocument(type: DocumentType) {
    setSelected(type);
    setCommunityTypeConfirmed(false);
    setSelectedIntentId(getIntentForDocument(type));
    setSelectedDocumentConfirmed(true);
    setGenerated(null);
    setError(null);
    setLastPayload(null);
    setLastCustomPayload(null);
    setLastCommunityPayload(null);
    router.replace(`/generar?type=${type}`, { scroll: false });
  }

  function selectCommunityMode() {
    setGeneratorMode("community");
    setCommunityTypeConfirmed(false);
    setSelectedDocumentConfirmed(false);
    setGenerated(null);
    setError(null);
    router.replace("/generar?mode=community", { scroll: false });
  }

  function selectCustomMode() {
    setGeneratorMode("custom");
    setCommunityTypeConfirmed(false);
    setSelectedDocumentConfirmed(false);
    setGenerated(null);
    setError(null);
    router.replace("/generar?mode=custom", { scroll: false });
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
      setError("No se pudo conectar con el generador. Comprueba tu conexión e inténtalo de nuevo.");
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
      setError("No se pudo conectar con el generador. Comprueba tu conexión e inténtalo de nuevo.");
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
        setError(data.message || "No se pudo generar el documento de Mi catálogo.");
        return;
      }

      setGenerated(data);
    } catch {
      setError("No se pudo conectar con el generador. Comprueba tu conexión e inténtalo de nuevo.");
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
      setError("No se pudo conectar con el generador. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setRefiningMode(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="surface overflow-hidden p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
          <div>
            <p className="eyebrow">Crear documento</p>
            <h1 className="panel-title mt-3">Elige una forma de empezar</h1>
            <p className="body-muted mt-3 max-w-2xl">
              La opción recomendada es el catálogo oficial. Si no encuentras lo que necesitas, usa A medida o el Asistente.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <CreationModeCard
              active={generatorMode === "catalog"}
              eyebrow={documentTypes.length + " tipos"}
              title="Catálogo oficial"
              text="La forma más rápida y guiada."
              onClick={() => selectCatalogIntent("all")}
            />
            <CreationModeCard
              active={generatorMode === "community"}
              eyebrow={personalCatalogTypes.length + " guardados"}
              title="Mi catálogo"
              text={personalCatalogTypes.length > 0 ? "Formatos propios reutilizables." : "Aparecerá cuando guardes tipos propios."}
              onClick={selectCommunityMode}
            />
            <CreationModeCard
              active={generatorMode === "custom"}
              eyebrow={customProLocked ? "Pro" : "Incluido"}
              title="A medida"
              text="Para documentos que no están en la lista."
              onClick={selectCustomMode}
            />
          </div>
        </div>

        {generatorMode === "community" && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8f3dc] bg-[#fffdf8]/78 p-4">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Mi catálogo está separado de Documentos</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Aquí solo eliges y generas. Para editar, borrar o revisar tus tipos guardados, usa la biblioteca.</p>
            </div>
            <Link href="/mi-catalogo" className="focus-ring btn-secondary px-4 py-3 text-sm">
              Gestionar Mi catálogo
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-6">
      <section className="surface min-h-[520px] p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#d8f3dc] pb-5">
          <div>
            <p className="text-sm font-semibold text-[#2d6a4f]">
              {generatorMode === "catalog"
                ? selectedDocumentConfirmed
                  ? config.category
                  : "Paso 2"
                : generatorMode === "community"
                  ? selectedCommunityType?.category || "Mi catálogo"
                  : "Documento a medida"}
            </p>
            <h1 className="panel-title mt-1">
              {generatorMode === "catalog"
                ? selectedDocumentConfirmed
                  ? config.label
                  : selectedIntent.id === "all"
                    ? "Elige el documento que necesitas"
                    : `Elige documento para ${selectedIntent.label.toLowerCase()}`
                : generatorMode === "community"
                  ? communityTypeConfirmed
                    ? selectedCommunityType?.label || "Mi catálogo"
                    : "Elige un tipo de Mi catálogo"
                  : "No encuentro mi documento"}
            </h1>
            <p className="body-muted mt-2 max-w-2xl">
              {generatorMode === "catalog" && !selectedDocumentConfirmed
                ? "Abre una categoría o usa el buscador. Cuando elijas un documento, cargaremos solo su formulario."
                : generatorMode === "catalog"
                ? "Completa los datos principales. DocuGen no inventará información no aportada y usará marcadores si falta algo."
                : generatorMode === "community"
                  ? communityTypeConfirmed
                    ? "Completa los campos sugeridos por este tipo personalizado."
                    : "Aquí aparecerán los documentos personalizados que guardes desde A medida o el Asistente."
                  : "Explica qué documento necesitas. Lo guardaremos como solicitud interna para detectar nuevos tipos útiles."}
            </p>
            {generatorMode === "catalog" && selectedDocumentConfirmed && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="badge badge-free">{config.fields.length} datos</span>
                <span className="badge bg-[#faf9f6] text-slate-600">
                  {config.includesSignatures ? "Con firmas si aplica" : "Sin firmas"}
                </span>
                <span className={requiresPro(config) ? "badge badge-pro" : "badge badge-free"}>
                  {requiresPro(config) ? "Solo Pro" : "Incluido"}
                </span>
              </div>
            )}
          </div>
          {loading && <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">Generando borrador...</span>}
        </div>
        {generatorMode === "catalog" && !selectedDocumentConfirmed ? (
          <DocumentChoicePanel
            groupedDocuments={groupedDocuments}
            selectedIntent={selectedIntent}
            selectedIntentId={selectedIntentId}
            documentQuery={documentQuery}
            onQueryChange={setDocumentQuery}
            onSelectDocument={selectDocument}
            onSelectIntent={selectCatalogIntent}
            onShowAll={() => selectCatalogIntent("all")}
          />
        ) : generatorMode === "community" && !communityTypeConfirmed ? (
          <CommunityChoicePanel
            communityTypes={personalCatalogTypes}
            plan={plan}
            onUpdate={(updatedType) => {
              setPersonalCatalogTypes((current) => current.map((type) => (type.id === updatedType.id ? updatedType : type)));
            }}
            onDelete={(typeId) => {
              setPersonalCatalogTypes((current) => current.filter((type) => type.id !== typeId));
              if (selectedCommunityId === typeId) {
                setSelectedCommunityId("");
                setCommunityTypeConfirmed(false);
              }
            }}
            onSelect={(typeId) => {
              setSelectedCommunityId(typeId);
              setCommunityTypeConfirmed(true);
              setGenerated(null);
              setError(null);
            }}
          />
        ) : generatorMode === "community" && selectedCommunityType && communityLocked ? (
          <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-6">
            <p className="eyebrow">Plan requerido</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Desbloquea {selectedCommunityType.label.toLowerCase()}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Este tipo de Mi catálogo requiere el plan {selectedCommunityType.required_plan}. Los tipos personalizados pueden tener instrucciones más avanzadas que los tipos gratuitos.
            </p>
            <Link href="/precios" className="focus-ring btn-primary mt-6 inline-flex px-5 py-3 text-sm">
              Ver planes
            </Link>
          </div>
        ) : generatorMode === "community" && selectedCommunityType ? (
          <CommunityForm
            key={selectedCommunityType.id}
            communityType={selectedCommunityType}
            disabled={loading}
            onUpdate={(updatedType) => {
              setPersonalCatalogTypes((current) => current.map((type) => (type.id === updatedType.id ? updatedType : type)));
            }}
            onSubmit={(formData) => submitCommunity({ communityTypeId: selectedCommunityType.id, formData })}
          />
        ) : generatorMode === "community" ? (
          <EmptyState
            eyebrow="Sin documentos de Mi catálogo"
            title="Aún no hay tipos de Mi catálogo disponibles"
            description="Cuando guardes documentos a medida o del asistente como tipos reutilizables, aparecerán aquí."
            variant="flat"
          />
        ) : generatorMode === "custom" && customProLocked ? (
          <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-6">
            <p className="eyebrow">Función Pro</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Crea documentos que no están en los tipos disponibles</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              El modo a medida permite pedir documentos por escrito, con instrucciones libres, tono específico y contexto propio.
              Lo reservamos para Pro porque usa prompts más avanzados y tiene mayor coste de generación.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/precios" className="focus-ring btn-primary px-5 py-3 text-sm">
                Desbloquear Pro
              </Link>
              <button
                type="button"
                onClick={() => {
                  setGeneratorMode("catalog");
                  setSelectedDocumentConfirmed(false);
                }}
                className="focus-ring btn-secondary px-5 py-3 text-sm"
              >
                Volver a tipos
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
              Este documento está reservado para DocuGen Pro porque requiere instrucciones más avanzadas y suele tener
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
        {loading && (
          <div className="mt-4 rounded-md border border-[#d8f3dc] bg-[#f4fbf5] p-4 text-sm text-[#1f2933]">
            <p className="font-bold text-[#2d6a4f]">DocuGen está preparando tu borrador</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Normalmente tarda unos segundos. Mantén esta pestaña abierta; el resultado aparecerá aquí al terminar.
            </p>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">No se pudo completar la acción</p>
            <p className="mt-1">{error}</p>
          </div>
        )}
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
            canSaveToCatalog={generated.docType === "custom"}
            onRegenerate={regenerateGenerated}
            onRefine={getDocumentConfig(generated.docType) ? refineGenerated : undefined}
            refiningMode={refiningMode}
          />
        </div>
      )}
      </div>
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

function CreationModeCard({
  active,
  eyebrow,
  title,
  text,
  onClick,
  disabled = false,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring interactive-subtle rounded-md border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-[#2d6a4f] bg-[#d8f3dc]/60 shadow-[0_10px_28px_rgba(45,106,79,0.12)]" : "border-[#d8f3dc] bg-[#fffdf8]/76"
      }`}
    >
      <span className="badge badge-free">{eyebrow}</span>
      <span className="mt-3 block font-bold text-[#1f2933]">{title}</span>
      <span className="mt-2 block text-xs leading-5 text-slate-600">{disabled ? "Aún no hay tipos disponibles." : text}</span>
    </button>
  );
}

function DocumentChoicePanel({
  groupedDocuments,
  selectedIntent,
  selectedIntentId,
  documentQuery,
  onQueryChange,
  onSelectDocument,
  onSelectIntent,
  onShowAll,
}: {
  groupedDocuments: Array<{ category: string; documents: typeof documentTypes[number][] }>;
  selectedIntent: GeneratorIntent;
  selectedIntentId: GeneratorIntentId;
  documentQuery: string;
  onQueryChange: (value: string) => void;
  onSelectDocument: (type: DocumentType) => void;
  onSelectIntent: (intentId: GeneratorIntentId) => void;
  onShowAll: () => void;
}) {
  const hasSearch = documentQuery.trim().length > 0;
  const isFiltered = selectedIntent.id !== "all";
  const visibleDocuments = groupedDocuments.flatMap((group) => group.documents);
  const categoryCount = groupedDocuments.length;

  return (
    <div className="grid gap-5">
      <div className="surface-muted p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Catálogo oficial</p>
            <h2 className="mt-2 font-serif-display text-2xl font-bold">
              {isFiltered ? selectedIntent.label : "Busca o abre una categoría"}
            </h2>
            <p className="body-muted mt-2 max-w-2xl">
              {isFiltered
                ? selectedIntent.description
                : "Empieza con un objetivo, busca por palabra o abre una categoría. Al elegir un documento, solo verás sus campos."}
            </p>
          </div>
          <span className="badge badge-free">{visibleDocuments.length} tipos</span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar</span>
            <input
              value={documentQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              className="field-control mt-2"
              placeholder="Contrato, reclamación, privacidad..."
            />
          </label>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Objetivo</span>
            <select
              value={selectedIntentId}
              onChange={(event) => onSelectIntent(event.target.value as GeneratorIntentId)}
              className="field-control mt-2"
            >
              {generatorIntents.map((intent) => (
                <option key={intent.id} value={intent.id}>
                  {intent.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(isFiltered || hasSearch) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#d8f3dc] bg-[#fffdf8]/78 p-3">
            <p className="text-xs leading-5 text-slate-600">
              Mostrando {visibleDocuments.length} tipos en {categoryCount} categorías.
            </p>
            {isFiltered && (
              <button type="button" onClick={onShowAll} className="focus-ring btn-ghost px-3 py-2 text-xs">
                Quitar filtro
              </button>
            )}
          </div>
        )}
      </div>

      {visibleDocuments.length > 0 ? (
        <div className="grid gap-3">
          {groupedDocuments.map((group) => (
            <details
              key={group.category}
              open={hasSearch || isFiltered}
              className="doc-accordion group rounded-xl border border-[#d8f3dc] bg-[#fffdf8]/76 shadow-[0_8px_24px_rgba(31,41,51,0.04)] open:border-[#2d6a4f] open:bg-[#f4fbf5]"
            >
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-4 transition hover:bg-[#faf9f6] group-open:bg-[#d8f3dc]/45">
                <span>
                  <span className="block font-bold text-[#1f2933]">{group.category}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {group.documents.length} tipos disponibles
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="badge badge-free">
                    {group.documents.length}
                  </span>
                  <span className="text-sm font-bold text-[#2d6a4f] group-open:rotate-180">⌄</span>
                </span>
              </summary>
              <div className="divide-y divide-[#d8f3dc] border-t border-[#2d6a4f]/25 bg-[#fffdf8]/62">
                {group.documents.map((doc) => (
                  <button
                    key={doc.type}
                    type="button"
                    onClick={() => onSelectDocument(doc.type)}
                    className="focus-ring interactive-subtle block w-full px-4 py-4 text-left"
                  >
                    <span className="flex flex-wrap items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-bold text-[#1f2933]">{doc.label}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">{doc.summary}</span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className="badge bg-[#faf9f6] text-slate-600">
                          {doc.fields.length} datos
                        </span>
                        {requiresPro(doc) ? (
                          <span className="badge badge-pro">Pro</span>
                        ) : (
                          <span className="badge badge-free">Free</span>
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState
          eyebrow="Sin coincidencias"
          title="No encontramos ese documento"
          description="Prueba con una palabra más general o usa el modo a medida si tu plan lo permite."
          variant="flat"
          secondaryAction={{ href: "/catalogo", label: "Ver todos los tipos" }}
        />
      )}
    </div>
  );
}
function getDocumentsForIntent(intentId: GeneratorIntentId) {
  return documentTypes.filter((doc) => documentMatchesIntent(doc, intentId));
}

function getValidIntentId(value: string | null): GeneratorIntentId | null {
  return generatorIntents.some((intent) => intent.id === value) ? (value as GeneratorIntentId) : null;
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

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function CommunityChoicePanel({
  communityTypes,
  plan,
  onSelect,
}: {
  communityTypes: CommunityTypeOption[];
  plan: "free" | "pro" | "empresa";
  onSelect: (typeId: string) => void;
  onUpdate: (type: CommunityTypeOption) => void;
  onDelete: (typeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTypes = communityTypes.filter((type) => {
    if (!normalizedQuery) {
      return true;
    }

    return (type.label + " " + type.description + " " + (type.category || "")).toLowerCase().includes(normalizedQuery);
  });

  if (communityTypes.length === 0) {
    return (
      <EmptyState
        eyebrow="Mi catálogo vacío"
        title="Todavía no tienes tipos reutilizables"
        description="Genera un documento a medida o desde el asistente. Cuando te guste el resultado, guárdalo en Mi catálogo desde Documentos."
        variant="flat"
        primaryAction={{ href: "/generar?mode=custom", label: "Crear a medida" }}
        secondaryAction={{ href: "/asistente", label: "Abrir asistente" }}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="surface-muted p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Mi catálogo</p>
            <h2 className="font-serif-display mt-2 text-2xl font-bold">Elige un tipo reutilizable</h2>
            <p className="body-muted mt-2 max-w-2xl">
              Estos no son documentos finales: son moldes guardados para crear nuevos borradores con campos propios.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-free">{communityTypes.length} guardados</span>
            <Link href="/mi-catalogo" className="focus-ring btn-secondary px-3 py-2 text-xs">
              Gestionar
            </Link>
          </div>
        </div>
        <label className="mt-5 block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Buscar en Mi catálogo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, guía o categoría..."
            className="field-control mt-2"
          />
        </label>
      </div>

      {visibleTypes.length === 0 ? (
        <EmptyState
          eyebrow="Sin resultados"
          title="No hay tipos con esa búsqueda"
          description="Prueba con otra palabra o abre la gestión de Mi catálogo para revisar todos tus tipos."
          variant="flat"
          secondaryAction={{ href: "/mi-catalogo", label: "Gestionar Mi catálogo" }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleTypes.map((type) => {
            const locked = !canUseCommunityType(plan, type.required_plan);

            return (
              <article key={type.id} className="surface-flat interactive-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">
                      {type.category || "Mi catálogo"}
                    </p>
                    <h3 className="font-serif-display mt-2 text-xl font-bold leading-7 text-[#1f2933]">{type.label}</h3>
                  </div>
                  <span className={locked ? "badge badge-pro" : "badge badge-free"}>{locked ? type.required_plan : "Listo"}</span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{type.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#d8f3dc] pt-4">
                  <span className="text-xs font-semibold text-slate-500">{type.suggested_fields.length} campos</span>
                  <button
                    type="button"
                    onClick={() => onSelect(type.id)}
                    className="focus-ring btn-primary px-4 py-2 text-xs"
                  >
                    {locked ? "Ver plan" : "Usar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

type CommunityFieldOption = CommunityTypeOption["suggested_fields"][number];

function CommunityForm({
  communityType,
  disabled,
  onSubmit,
  onUpdate,
}: {
  communityType: CommunityTypeOption;
  disabled: boolean;
  onSubmit: (formData: Record<string, string>) => void;
  onUpdate: (type: CommunityTypeOption) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<CommunityFieldOption[]>(communityType.suggested_fields);
  const [editingGuide, setEditingGuide] = useState(false);
  const [usageDescription, setUsageDescription] = useState(communityType.description);
  const [savingGuide, setSavingGuide] = useState(false);
  const [guideMessage, setGuideMessage] = useState<string | null>(null);
  const [guideError, setGuideError] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [fieldMessage, setFieldMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [promptBrief, setPromptBrief] = useState(communityType.prompt_brief);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  async function saveGuide() {
    if (usageDescription.trim().length < 10) {
      setGuideError("Añade una guía un poco más clara antes de guardar.");
      return;
    }

    setSavingGuide(true);
    setGuideError(null);
    setGuideMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + communityType.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: communityType.label,
          description: usageDescription,
          category: communityType.category || "Mi catálogo",
        }),
      });
      const data = (await response.json().catch(() => null)) as { catalogType?: CommunityTypeOption; message?: string } | null;

      if (!response.ok || !data?.catalogType) {
        throw new Error(data?.message || "No se pudo guardar la guía de uso.");
      }

      setUsageDescription(data.catalogType.description);
      onUpdate(data.catalogType);
      setEditingGuide(false);
      setGuideMessage("Guía de uso guardada.");
    } catch (error) {
      setGuideError(error instanceof Error ? error.message : "No se pudo guardar la guía de uso.");
    } finally {
      setSavingGuide(false);
    }
  }

  async function saveFields() {
    const normalizedFields = fields.map(normalizeCommunityField).filter((field) => field.name && field.label);

    if (normalizedFields.length === 0) {
      setFieldError("Añade al menos un campo para este tipo.");
      return;
    }

    setSavingFields(true);
    setFieldError(null);
    setFieldMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + communityType.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: communityType.label,
          description: usageDescription,
          category: communityType.category || "Mi catálogo",
          suggested_fields: normalizedFields,
        }),
      });
      const data = (await response.json().catch(() => null)) as { catalogType?: CommunityTypeOption; message?: string } | null;

      if (!response.ok || !data?.catalogType) {
        throw new Error(data?.message || "No se pudieron guardar los campos.");
      }

      setFields(data.catalogType.suggested_fields);
      onUpdate(data.catalogType);
      setEditingFields(false);
      setFieldMessage("Campos guardados.");
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "No se pudieron guardar los campos.");
    } finally {
      setSavingFields(false);
    }
  }

  async function savePromptBrief() {
    if (promptBrief.trim().length < 20) {
      setPromptError("Añade instrucciones un poco más concretas antes de guardar.");
      return;
    }

    setSavingPrompt(true);
    setPromptError(null);
    setPromptMessage(null);

    try {
      const response = await fetch("/api/personal-catalog/" + communityType.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: communityType.label,
          description: usageDescription,
          category: communityType.category || "Mi catálogo",
          prompt_brief: promptBrief,
        }),
      });
      const data = (await response.json().catch(() => null)) as { catalogType?: CommunityTypeOption; message?: string } | null;

      if (!response.ok || !data?.catalogType) {
        throw new Error(data?.message || "No se pudieron guardar las instrucciones.");
      }

      setPromptBrief(data.catalogType.prompt_brief);
      onUpdate(data.catalogType);
      setPromptMessage("Instrucciones guardadas.");
    } catch (error) {
      setPromptError(error instanceof Error ? error.message : "No se pudieron guardar las instrucciones.");
    } finally {
      setSavingPrompt(false);
    }
  }

  function updateField(index: number, patch: Partial<CommunityFieldOption>) {
    setFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const field = next.splice(index, 1)[0];
      next.splice(target, 0, field);
      return next;
    });
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(formData);
      }}
    >
      <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6] p-3 text-sm leading-6 text-slate-600">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl">{usageDescription}</p>
          <button
            type="button"
            onClick={() => {
              setEditingGuide((current) => !current);
              setGuideError(null);
              setGuideMessage(null);
            }}
            className="focus-ring btn-ghost px-2 py-1 text-xs"
          >
            {editingGuide ? "Ocultar guía" : "Editar guía"}
          </button>
        </div>
        {guideMessage && <p className="mt-2 text-xs font-semibold text-[#2d6a4f]">{guideMessage}</p>}
        {guideError && <p className="mt-2 text-xs font-semibold text-red-700">{guideError}</p>}
        {editingGuide && (
          <div className="mt-3 rounded-md border border-[#d8f3dc] bg-[#fffdf8] p-3">
            <label>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d6a4f]">Guía visible para este documento</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Explica cuándo usar este tipo o añade un ejemplo breve. Esto lo ve el usuario antes de rellenar el formulario.
              </span>
              <textarea
                value={usageDescription}
                onChange={(event) => setUsageDescription(event.target.value)}
                rows={4}
                className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveGuide()}
              disabled={savingGuide}
              className="focus-ring btn-secondary mt-3 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingGuide ? "Guardando..." : "Guardar guía"}
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              {field.label}
              {field.required && <span className="rounded-full bg-[#d8f3dc] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2d6a4f]">Obligatorio</span>}
            </span>
            {field.helpText && <span className="mt-1 block text-xs leading-5 text-slate-500">{field.helpText}</span>}
            {field.type === "textarea" ? (
              <textarea
                value={formData[field.name] || ""}
                onChange={(event) => setFormData((current) => ({ ...current, [field.name]: event.target.value }))}
                required={field.required}
                rows={4}
                className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-[#fffdf8]/92 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
              />
            ) : (
              <input
                type={getCommunityFieldInputType(field.type)}
                value={formData[field.name] || ""}
                onChange={(event) => setFormData((current) => ({ ...current, [field.name]: event.target.value }))}
                required={field.required}
                className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-[#fffdf8]/92 px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
              />
            )}
          </label>
        ))}
      </div>

      <div className="rounded-md bg-[#faf9f6] p-3 text-xs leading-5 text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Este tipo pertenece a Mi catálogo. Puedes generar directamente o ajustar campos si lo necesitas.</span>
          <button
            type="button"
            onClick={() => {
              setEditingFields((current) => !current);
              setFieldError(null);
              setFieldMessage(null);
            }}
            className="focus-ring btn-ghost px-2 py-1 text-xs"
          >
            {editingFields ? "Ocultar campos" : "Editar campos"}
          </button>
        </div>
        {fieldMessage && <p className="mt-2 font-semibold text-[#2d6a4f]">{fieldMessage}</p>}
        {fieldError && <p className="mt-2 font-semibold text-red-700">{fieldError}</p>}
        <div className="mt-3 border-t border-[#d8f3dc] pt-3">
          <button
            type="button"
            onClick={() => {
              setShowAdvanced((current) => !current);
              setPromptError(null);
              setPromptMessage(null);
            }}
            className="focus-ring btn-ghost px-2 py-1 text-xs"
          >
            {showAdvanced ? "Ocultar ajustes avanzados" : "Ajustes avanzados"}
          </button>
          {showAdvanced && (
            <div className="mt-3 rounded-md border border-[#d8f3dc] bg-[#fffdf8] p-3">
              <label>
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d6a4f]">Instrucciones internas</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Define cómo debe redactarse este tipo. Úsalo solo si quieres afinar tono, estructura o reglas concretas.
                </span>
                <textarea
                  value={promptBrief}
                  onChange={(event) => setPromptBrief(event.target.value)}
                  rows={7}
                  className="focus-ring mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-[#1f2933] transition focus:border-[#2d6a4f]"
                />
              </label>
              {promptMessage && <p className="mt-2 text-xs font-semibold text-[#2d6a4f]">{promptMessage}</p>}
              {promptError && <p className="mt-2 text-xs font-semibold text-red-700">{promptError}</p>}
              <button
                type="button"
                onClick={() => void savePromptBrief()}
                disabled={savingPrompt}
                className="focus-ring btn-secondary mt-3 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPrompt ? "Guardando..." : "Guardar instrucciones"}
              </button>
            </div>
          )}
        </div>
        {editingFields && (
          <div className="mt-4 grid gap-3 border-t border-[#d8f3dc] pt-4">
            {fields.map((field, index) => (
              <div key={field.name + "-" + index} className="rounded-md border border-[#d8f3dc] bg-[#fffdf8] p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_130px]">
                  <label>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d6a4f]">Etiqueta</span>
                    <input
                      value={field.label}
                      onChange={(event) => updateField(index, { label: event.target.value, name: sanitizeCommunityFieldName(event.target.value) })}
                      className="field-control mt-1"
                    />
                  </label>
                  <label>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d6a4f]">Ayuda</span>
                    <input
                      value={field.helpText || ""}
                      onChange={(event) => updateField(index, { helpText: event.target.value })}
                      className="field-control mt-1"
                      placeholder="Texto breve opcional"
                    />
                  </label>
                  <label>
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2d6a4f]">Tipo</span>
                    <select
                      value={field.type}
                      onChange={(event) => updateField(index, { type: event.target.value as CommunityFieldOption["type"] })}
                      className="field-control mt-1"
                    >
                      <option value="text">Texto</option>
                      <option value="textarea">Texto largo</option>
                      <option value="date">Fecha</option>
                      <option value="email">Email</option>
                      <option value="number">Número</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(event) => updateField(index, { required: event.target.checked })}
                    />
                    Obligatorio
                  </label>
                  <button type="button" onClick={() => moveField(index, -1)} className="focus-ring btn-ghost px-2 py-1 text-xs" disabled={index === 0}>
                    Subir
                  </button>
                  <button type="button" onClick={() => moveField(index, 1)} className="focus-ring btn-ghost px-2 py-1 text-xs" disabled={index === fields.length - 1}>
                    Bajar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))}
                    className="focus-ring rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFields((current) => [...current, createEmptyCommunityField(current.length + 1)])}
                className="focus-ring btn-secondary px-3 py-2 text-xs"
              >
                Añadir campo
              </button>
              <button
                type="button"
                onClick={() => void saveFields()}
                disabled={savingFields}
                className="focus-ring btn-primary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingFields ? "Guardando..." : "Guardar campos"}
              </button>
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={disabled} className="focus-ring btn-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
        {disabled ? "Generando..." : "Generar desde Mi catálogo"}
      </button>
    </form>
  );
}

function createEmptyCommunityField(index: number): CommunityFieldOption {
  return {
    name: "campo_" + index,
    label: "Campo " + index,
    type: "text",
    required: false,
    helpText: "",
  };
}

function normalizeCommunityField(field: CommunityFieldOption): CommunityFieldOption {
  return {
    name: sanitizeCommunityFieldName(field.name || field.label),
    label: field.label.trim() || "Campo",
    type: field.type,
    required: Boolean(field.required),
    helpText: field.helpText?.trim() || undefined,
  };
}

function sanitizeCommunityFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "campo";
}

function getCommunityFieldInputType(type: CommunityTypeOption["suggested_fields"][number]["type"]) {
  if (type === "email" || type === "date" || type === "number") {
    return type;
  }

  return "text";
}

function canUseCommunityType(userPlan: "free" | "pro" | "empresa", requiredPlan: "free" | "pro" | "empresa") {
  const rank = {
    free: 0,
    pro: 1,
    empresa: 2,
  };

  return rank[userPlan] >= rank[requiredPlan];
}


