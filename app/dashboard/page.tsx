import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlanBadge } from "@/components/PlanBadge";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { documentTypes, getDocumentConfig, requiresPro } from "@/lib/document-types";
import { getCurrentProfile, type BrandSettings, type DocumentRow } from "@/lib/supabase-server";

type DashboardDocumentConfig = (typeof documentTypes)[number];

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<DocumentRow[]>();

  const { data: brandSettings } =
    profile.plan !== "free"
      ? await supabase.from("brand_settings").select("*").eq("user_id", profile.id).maybeSingle<BrandSettings>()
      : { data: null };

  const allDocuments = documents || [];
  const recentDocuments = allDocuments.slice(0, 5);
  const lastDocument = recentDocuments[0];
  const listedRecentDocuments = lastDocument ? recentDocuments.filter((doc) => doc.id !== lastDocument.id) : recentDocuments;
  const remaining = Math.max(3 - profile.docs_this_month, 0);
  const isFree = profile.plan === "free";
  const mostUsedTypes = getMostUsedTypes(allDocuments);
  const hasBrand = Boolean(brandSettings?.company_name || brandSettings?.cif || brandSettings?.address || brandSettings?.logo_url);
  const recommendedDocuments = getRecommendedDocuments(allDocuments, isFree);
  const nextStep = getNextStep({ isFree, remaining, hasDocuments: allDocuments.length > 0, hasBrand, canUseBrand: profile.plan !== "free" });
  const displayName = user?.email?.split("@")[0] || "tu espacio";

  return (
    <section className="container-page py-10">
      <div className="surface mb-6 overflow-hidden rounded-md">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="font-serif-display mt-3 text-4xl font-bold">Bienvenido a DocuGen, {displayName}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Tu centro de trabajo para crear, reutilizar y exportar documentos profesionales sin pasar por la landing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
                Crear documento
              </Link>
              <Link href="/catalogo" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Explorar catalogo
              </Link>
              <Link href="/historial" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Abrir historial
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-[#d8f3dc] bg-white/78 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#2d6a4f]">Plan actual</p>
              <PlanBadge plan={profile.plan} />
            </div>
            <div className="mt-5">
              <UsageBar used={profile.docs_this_month} plan={profile.plan} />
            </div>
            <p className="mt-4 text-sm text-slate-600">
              {isFree
                ? remaining > 0
                  ? `Te quedan ${remaining} documentos gratuitos este mes.`
                  : "Has agotado tus documentos gratuitos este mes."
                : "Documentos ilimitados activos."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Documentos guardados" value={allDocuments.length.toString()} helper="En tu historial actual" />
        <MetricCard
          label="Generados este mes"
          value={profile.docs_this_month.toString()}
          helper={isFree ? `${remaining} restantes en Free` : "Sin limite mensual en Pro"}
        />
        <MetricCard
          label="Tipo mas usado"
          value={mostUsedTypes[0]?.label || "Sin datos"}
          helper={mostUsedTypes[0] ? `${mostUsedTypes[0].count} documentos` : "Genera tu primer borrador"}
        />
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Free vs Pro</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">
              {isFree ? "Tu plan Free sirve para probar el flujo completo" : "Tu plan Pro desbloquea el flujo completo"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isFree
                ? "Puedes crear 3 documentos al mes, guardarlos en historial y exportar PDF/TXT. Cuando necesites volumen, Word, plantillas o documentos a medida, Pro es el siguiente paso."
                : "Puedes generar sin limite mensual, exportar Word, usar marca personalizada, plantillas y documentos a medida."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PlanCapability label="PDF y TXT" available helper="Incluido en Free y Pro" />
            <PlanCapability label="Word editable" available={!isFree} helper={isFree ? "Disponible en Pro" : "Incluido"} />
            <PlanCapability label="Documentos a medida" available={!isFree} helper={isFree ? "Disponible en Pro" : "Incluido"} />
            <PlanCapability label="Plantillas propias" available={!isFree} helper={isFree ? "Disponible en Pro" : "Incluido"} />
          </div>
        </div>
      </section>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Que quieres hacer ahora?</h2>
            <p className="mt-1 text-sm text-slate-600">
              DocuGen se organiza en cuatro zonas. Esta guia te lleva a la pantalla correcta sin tener que adivinar.
            </p>
          </div>
          <Link href="/generar" className="focus-ring btn-primary px-4 py-2 text-sm">
            Crear documento
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <ActionCard
            title="Crear desde catalogo"
            text="Para contratos, cartas, presupuestos, politicas web y documentos ya definidos."
            href="/generar"
            action="Abrir generador"
          />
          <ActionCard
            title="Pedir uno a medida"
            text={isFree ? "Disponible en Pro. Sirve para documentos que no estan en el catalogo." : "Describe lo que necesitas y la IA preparara un borrador personalizado."}
            href={isFree ? "/precios" : "/generar?mode=custom"}
            action={isFree ? "Ver Pro" : "Crear a medida"}
          />
          <ActionCard
            title="Usar mis plantillas"
            text={profile.plan === "free" ? "En Pro puedes subir documentos de referencia para orientar estilo y estructura." : "Sube o reutiliza plantillas propias como referencia de tono y estructura."}
            href={profile.plan === "free" ? "/precios" : "/plantillas"}
            action={profile.plan === "free" ? "Ver Pro" : "Ir a plantillas"}
          />
          <ActionCard
            title="Editar lo ya creado"
            text="Abre historial para editar, guardar versiones, comparar mejoras IA y exportar."
            href="/historial"
            action="Abrir historial"
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <section className="surface rounded-md p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Siguiente paso</h2>
              <p className="mt-1 text-sm text-slate-600">{nextStep.description}</p>
            </div>
          </div>

          <Link href={nextStep.href} className="focus-ring btn-primary mt-6 px-4 py-3 text-sm">
            {nextStep.action}
          </Link>

          <div className="mt-6 border-t border-[#d8f3dc] pt-6">
            <h3 className="font-semibold">Suscripcion</h3>
            {isFree && remaining === 0 && (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                Has alcanzado el limite de 3 documentos gratuitos este mes.
              </p>
            )}
            {!isFree && !hasBrand && (
              <p className="mt-3 rounded-md bg-[#d8f3dc] p-3 text-sm font-medium text-[#1f2933]">
                Tu cuenta esta en Pro. Configura la marca para que PDF y Word salgan mas profesionales.
              </p>
            )}
            {!isFree && hasBrand && (
              <p className="mt-3 rounded-md bg-[#d8f3dc] p-3 text-sm font-medium text-[#1f2933]">
                Tu marca esta configurada. Las exportaciones pueden usar tus datos corporativos.
              </p>
            )}
            <div className="mt-4">
              <SubscriptionActions plan={profile.plan} hasCustomer={Boolean(profile.stripe_customer_id)} />
            </div>
            <Link href="/precios" className="mt-4 inline-flex text-sm font-semibold text-[#2d6a4f]">
              Comparar planes
            </Link>
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Historial reciente</h2>
              <p className="mt-1 text-sm text-slate-600">Ultimos borradores generados.</p>
            </div>
            <Link href="/historial" className="btn-ghost px-3 py-2 text-sm">
              Ver todo
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[#d8f3dc]">
            {lastDocument && (
              <div className="mb-3 rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Continua donde lo dejaste</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{lastDocument.doc_label}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(lastDocument.created_at).toLocaleDateString("es-ES")} -{" "}
                      {getDocumentConfig(lastDocument.doc_type)?.category}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/historial/${lastDocument.id}`} className="btn-secondary px-3 py-2 text-xs">
                      Abrir
                    </Link>
                    <Link href={`/generar?templateId=${lastDocument.id}`} className="btn-primary px-3 py-2 text-xs">
                      Reutilizar
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {listedRecentDocuments.map((doc) => (
              <article key={doc.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{doc.doc_label}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString("es-ES")} - {getDocumentConfig(doc.doc_type)?.category}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/historial/${doc.id}`} className="btn-secondary px-3 py-2 text-xs">
                      Ver
                    </Link>
                    <Link href={`/generar?templateId=${doc.id}`} className="btn-ghost px-3 py-2 text-xs">
                      Plantilla
                    </Link>
                  </div>
                </div>
              </article>
            ))}
            {recentDocuments.length === 0 && (
              <EmptyPanel
                title="Aun no has generado documentos"
                text="Empieza con un contrato, propuesta o carta. Cuando generes tu primer borrador, aparecera aqui para reutilizarlo."
                href="/generar"
                action="Crear primer documento"
              />
            )}
          </div>
        </section>
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Documentos recomendados</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sugerencias segun tu historial y los documentos mas habituales de DocuGen.
            </p>
          </div>
          <Link href="/catalogo" className="btn-ghost px-3 py-2 text-sm">
            Ver catalogo
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedDocuments.map((doc) => (
            <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive rounded-md p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</p>
                {requiresPro(doc) && (
                  <span className="rounded-full bg-[#2d6a4f] px-2 py-0.5 text-[10px] font-bold text-white">Pro</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold">{doc.label}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{doc.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface mt-4 rounded-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{hasBrand ? "Marca personalizada activa" : "Marca personalizada"}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {profile.plan === "free"
                ? "En Pro podras anadir datos corporativos y logo a tus exportaciones Word y PDF."
                : hasBrand
                  ? "Tus datos corporativos estan listos para exportaciones Word, PDF y futuras plantillas de marca."
                  : "Configura datos corporativos y logo para exportaciones Word, PDF y futuras plantillas de marca."}
            </p>
          </div>
          {profile.plan === "free" ? (
            <Link href="/precios" className="focus-ring btn-primary px-4 py-2 text-sm">
              Ver Pro
            </Link>
          ) : (
            <Link href="/ajustes" className="focus-ring btn-secondary px-4 py-2 text-sm">
              {hasBrand ? "Editar marca" : "Configurar marca"}
            </Link>
          )}
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat interactive rounded-md p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function PlanCapability({ label, available, helper }: { label: string; available: boolean; helper: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${available ? "bg-[#d8f3dc] text-[#2d6a4f]" : "bg-slate-200 text-slate-500"}`}>
          {available ? "Activo" : "Pro"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function ActionCard({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <Link href={href} className="surface-flat interactive rounded-md p-4">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-3 inline-flex text-sm font-bold text-[#2d6a4f]">{action}</span>
    </Link>
  );
}

function EmptyPanel({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6]/70 p-6">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <Link href={href} className="focus-ring btn-primary mt-4 px-4 py-2 text-sm">
        {action}
      </Link>
    </div>
  );
}

function getMostUsedTypes(documents: DocumentRow[]) {
  const counts = new Map<string, number>();

  for (const doc of documents) {
    counts.set(doc.doc_type, (counts.get(doc.doc_type) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      label: getDocumentConfig(type)?.label || type,
    }))
    .sort((a, b) => b.count - a.count);
}

function getNextStep({
  isFree,
  remaining,
  hasDocuments,
  hasBrand,
  canUseBrand,
}: {
  isFree: boolean;
  remaining: number;
  hasDocuments: boolean;
  hasBrand: boolean;
  canUseBrand: boolean;
}) {
  if (isFree && remaining === 0) {
    return {
      description: "Has agotado los documentos gratuitos de este mes. Pro desbloquea generaciones ilimitadas.",
      action: "Ver planes",
      href: "/precios",
    };
  }

  if (!hasDocuments) {
    return {
      description: "Crea tu primer borrador para activar historial, plantillas y exportaciones.",
      action: "Crear primer documento",
      href: "/generar",
    };
  }

  if (canUseBrand && !hasBrand) {
    return {
      description: "Configura tu marca para que PDF y Word salgan con datos corporativos y logo.",
      action: "Configurar marca",
      href: "/ajustes",
    };
  }

  if (hasDocuments) {
    return {
      description: "Reutiliza tu ultimo documento como base o crea un nuevo borrador desde el catalogo.",
      action: "Continuar trabajando",
      href: "/historial",
    };
  }

  return {
    description: "Explora el catalogo y elige el documento que mejor encaje con tu caso.",
    action: "Ver catalogo",
    href: "/catalogo",
  };
}

function getRecommendedDocuments(documents: DocumentRow[], isFree: boolean): DashboardDocumentConfig[] {
  const preferredTypes = documents.length > 0 ? getMostUsedTypes(documents).map((item) => item.type) : [];
  const preferredCategories = new Set<string>();

  for (const type of preferredTypes) {
    const category = getDocumentConfig(type)?.category;

    if (category) {
      preferredCategories.add(category);
    }
  }

  const candidates = documentTypes.filter((doc) => {
    if (isFree && requiresPro(doc)) {
      return false;
    }

    return preferredCategories.size === 0 || preferredCategories.has(doc.category);
  });
  const fallbackTypes = ["contrato-freelance", "presupuesto-comercial", "carta-presentacion", "aviso-legal"];
  const fallback = fallbackTypes
    .map((type) => getDocumentConfig(type))
    .filter((doc): doc is DashboardDocumentConfig => Boolean(doc))
    .filter((doc) => !isFree || !requiresPro(doc));

  return uniqueDocuments([...candidates, ...fallback]).slice(0, 8);
}

function uniqueDocuments(documents: DashboardDocumentConfig[]) {
  const seen = new Set<string>();

  return documents.filter((doc) => {
    if (seen.has(doc.type)) {
      return false;
    }

    seen.add(doc.type);
    return true;
  });
}
