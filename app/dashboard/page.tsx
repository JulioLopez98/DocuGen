import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHelp } from "@/components/ContextualHelp";
import { PlanFirstSteps } from "@/components/PlanFirstSteps";
import { PlanBadge } from "@/components/PlanBadge";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { documentTypes, getDocumentConfig, requiresPro } from "@/lib/document-types";
import { getCurrentProfile, type BrandSettings, type DocumentRow } from "@/lib/supabase-server";

type DashboardDocumentConfig = (typeof documentTypes)[number];

export const metadata: Metadata = {
  title: "Panel",
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
  const remaining = Math.max(3 - profile.docs_this_month, 0);
  const isFree = profile.plan === "free";
  const isPaid = profile.plan === "pro" || profile.plan === "empresa";
  const isEmpresa = profile.plan === "empresa";
  const hasBrand = Boolean(brandSettings?.company_name || brandSettings?.cif || brandSettings?.address || brandSettings?.logo_url);
  const displayName = user?.email?.split("@")[0] || "tu espacio";
  const onboardingSteps = getOnboardingSteps({
    isPaid,
    isEmpresa,
    remaining,
    hasDocuments: allDocuments.length > 0,
    hasBrand,
  });
  const recommendedDocuments = getRecommendedDocuments(allDocuments, isFree);

  return (
    <section className="container-page py-10">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface overflow-hidden rounded-md p-6 lg:p-8">
          <p className="eyebrow">Panel</p>
          <h1 className="font-serif-display mt-3 max-w-3xl text-4xl font-bold lg:text-5xl">
            Hola, {displayName}. Que documento necesitas preparar?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Empieza por crear un borrador, reutiliza uno anterior o usa funciones avanzadas cuando el caso lo pida.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
              Crear documento
            </Link>
            <Link href={isPaid ? "/plantillas" : "/precios"} className="focus-ring btn-secondary px-5 py-3 text-sm">
              {isPaid ? "Usar plantillas" : "Ver funciones Pro"}
            </Link>
            <Link href="/historial" className="focus-ring btn-ghost px-5 py-3 text-sm">
              Ver documentos
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <QuickIntent href="/generar" label="Crear desde tipos" text="Contratos, cartas, presupuestos y documentos web." />
            <QuickIntent
              href={isPaid ? "/generar?mode=custom" : "/precios"}
              label="Pedir a medida"
              text={isPaid ? "Describe lo que necesitas si no esta en los tipos disponibles." : "Disponible en Pro para casos no catalogados."}
            />
            <QuickIntent href="/historial" label="Continuar trabajo" text="Edita, versiona, exporta o reutiliza documentos." />
          </div>
        </section>

        <aside className="surface rounded-md p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#2d6a4f]">Plan actual</p>
              <p className="mt-1 text-xs text-slate-500">Uso y suscripción</p>
            </div>
            <PlanBadge plan={profile.plan} />
          </div>
          <div className="mt-6">
            <UsageBar used={profile.docs_this_month} plan={profile.plan} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {isFree
              ? remaining > 0
                ? `Te quedan ${remaining} documentos gratuitos este mes.`
                : "Has agotado tus documentos gratuitos este mes."
              : "Generaciones ilimitadas activas."}
          </p>
          <div className="mt-5">
            <SubscriptionActions plan={profile.plan} hasCustomer={Boolean(profile.stripe_customer_id)} />
          </div>
          <Link href="/precios" className="mt-4 inline-flex text-sm font-bold text-[#2d6a4f]">
            Comparar planes
          </Link>
        </aside>
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Guía rápida</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Tu siguiente mejor paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Un recorrido corto para entender DocuGen sin perderte entre funciones avanzadas.
            </p>
          </div>
          <Link href="/onboarding" className="btn-secondary px-4 py-2 text-sm">
            Ver onboarding
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {onboardingSteps.map((step, index) => (
            <OnboardingStepCard key={step.title} index={index + 1} {...step} />
          ))}
        </div>
      </section>

      <div className="mt-4">
        <PlanFirstSteps
          plan={profile.plan}
          context={profile.plan === "empresa" ? "team" : profile.plan === "pro" ? "templates" : "documents"}
        />
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <ContextualHelp
          title="Para crear rapido"
          description="Usa Crear si tienes claro el tipo de documento o quieres buscar por intencion."
          items={["Elige una intencion.", "Rellena los campos.", "Revisa y exporta."]}
          primaryAction={{ href: "/generar", label: "Crear ahora" }}
        />
        <ContextualHelp
          title="Para trabajar con ejemplos"
          description="Las plantillas sirven para que DocuGen respete estructura y tono de documentos propios."
          items={isPaid ? ["Sube DOCX/PDF.", "Procesa la plantilla.", "Usala al generar."] : ["Disponible en Pro.", "Ideal para mantener estilo propio."]}
          primaryAction={{ href: isPaid ? "/plantillas" : "/precios", label: isPaid ? "Abrir plantillas" : "Ver Pro" }}
          tone="pro"
        />
        <ContextualHelp
          title="Para colaborar"
          description="Empresa agrupa miembros, documentos compartidos, invitaciones y actividad de equipo."
          items={isEmpresa ? ["Invita miembros.", "Comparte documentos.", "Revisa actividad."] : ["Disponible en Empresa.", "Pensado para equipos y clientes internos."]}
          primaryAction={{ href: isEmpresa ? "/workspace" : "/precios", label: isEmpresa ? "Abrir equipo" : "Ver Empresa" }}
          tone="empresa"
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface rounded-md p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Continuar</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Trabajo reciente</h2>
            </div>
            <Link href="/historial" className="btn-ghost px-3 py-2 text-sm">
              Ver todo
            </Link>
          </div>

          {lastDocument ? (
            <div className="rounded-md border border-[#d8f3dc] bg-[#faf9f6]/80 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">Último documento</p>
              <h3 className="mt-2 text-xl font-bold">{lastDocument.doc_label}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {formatDate(lastDocument.created_at)} · {getDocumentCategory(lastDocument)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/historial/${lastDocument.id}`} className="btn-primary px-4 py-2 text-sm">
                  Abrir documento
                </Link>
                <Link href={`/generar?templateId=${lastDocument.id}`} className="btn-secondary px-4 py-2 text-sm">
                  Usar como base
                </Link>
              </div>
            </div>
          ) : (
            <EmptyPanel
              title="Aún no has generado documentos"
              text="Crea tu primer borrador y aquí aparecerá para editarlo, exportarlo o reutilizarlo."
              href="/generar"
              action="Crear primer documento"
            />
          )}

          {recentDocuments.length > 1 && (
            <div className="mt-4 divide-y divide-[#d8f3dc]">
              {recentDocuments.slice(1).map((doc) => (
                <article key={doc.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{doc.doc_label}</h3>
                      <p className="text-xs text-slate-500">
                        {formatDate(doc.created_at)} · {getDocumentCategory(doc)}
                      </p>
                    </div>
                    <Link href={`/historial/${doc.id}`} className="btn-secondary px-3 py-2 text-xs">
                      Ver
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="surface rounded-md p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Recomendado</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Documentos útiles para empezar</h2>
            </div>
            <Link href="/catalogo" className="btn-ghost px-3 py-2 text-sm">
              Tipos de documento
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardStat label="Documentos guardados" value={allDocuments.length.toString()} helper="En Documentos" />
          <DashboardStat
            label="Este mes"
            value={profile.docs_this_month.toString()}
            helper={isFree ? `${remaining} restantes en Free` : "Sin límite mensual"}
          />
          <DashboardStat
            label="Marca"
            value={hasBrand ? "Lista" : isPaid ? "Pendiente" : "Pro"}
            helper={getBrandHelper({ hasBrand, isPaid })}
          />
        </div>
      </section>
    </section>
  );
}

function QuickIntent({ href, label, text }: { href: string; label: string; text: string }) {
  return (
    <Link href={href} className="rounded-md border border-[#d8f3dc] bg-white/70 p-4 transition hover:-translate-y-0.5 hover:bg-white">
      <p className="font-bold">{label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
    </Link>
  );
}

function OnboardingStepCard({
  index,
  title,
  text,
  href,
  action,
  done,
}: {
  index: number;
  title: string;
  text: string;
  href: string;
  action: string;
  done: boolean;
}) {
  return (
    <Link href={href} className={`rounded-md border p-4 transition hover:-translate-y-0.5 ${done ? "border-[#d8f3dc] bg-[#d8f3dc]/45" : "border-[#d8f3dc] bg-white/75"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">{index}</span>
        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${done ? "bg-white text-[#2d6a4f]" : "bg-[#faf9f6] text-slate-500"}`}>
          {done ? "Hecho" : "Pendiente"}
        </span>
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
      <span className="mt-3 inline-flex text-sm font-bold text-[#2d6a4f]">{action}</span>
    </Link>
  );
}

function DashboardStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat rounded-md p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
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

function getOnboardingSteps({
  isPaid,
  isEmpresa,
  remaining,
  hasDocuments,
  hasBrand,
}: {
  isPaid: boolean;
  isEmpresa: boolean;
  remaining: number;
  hasDocuments: boolean;
  hasBrand: boolean;
}) {
  return [
    {
      title: "Crea tu primer documento",
      text: "Elige un tipo, completa los campos y guarda un borrador editable.",
      href: "/generar",
      action: hasDocuments ? "Crear otro" : "Empezar",
      done: hasDocuments,
    },
    {
      title: "Revisa y exporta",
      text: "Abre Documentos para editar, exportar PDF/TXT o usar Word si tienes Pro.",
      href: hasDocuments ? "/historial" : "/generar",
      action: hasDocuments ? "Abrir documentos" : "Crear primero",
      done: hasDocuments,
    },
    {
      title: isPaid ? "Configura tu marca" : "Desbloquea Pro",
      text: isPaid
        ? "Añade datos corporativos y logo para que tus exportaciones salgan más profesionales."
        : remaining > 0
          ? "Pro añade Word, documentos a medida, plantillas y generaciones ilimitadas."
          : "Has agotado Free. Pro desbloquea documentos ilimitados.",
      href: isPaid ? "/ajustes" : "/precios",
      action: isPaid ? "Ir a ajustes" : "Ver planes",
      done: isPaid ? hasBrand : false,
    },
    {
      title: isEmpresa ? "Trabaja en equipo" : "Funciones avanzadas",
      text: isEmpresa
        ? "Invita miembros, comparte documentos y controla permisos."
        : "Plantillas, asistente y equipo viven fuera del flujo básico para no saturarte.",
      href: isEmpresa ? "/workspace" : isPaid ? "/plantillas" : "/precios",
      action: isEmpresa ? "Abrir equipo" : isPaid ? "Ver plantillas" : "Ver Pro",
      done: isEmpresa,
    },
  ];
}

function getRecommendedDocuments(documents: DocumentRow[], isFree: boolean): DashboardDocumentConfig[] {
  const preferredCategories = new Set<string>();

  for (const doc of documents) {
    const category = getDocumentConfig(doc.doc_type)?.category;

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

  return uniqueDocuments([...candidates, ...fallback]).slice(0, 6);
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

function getDocumentCategory(doc: DocumentRow) {
  return getDocumentConfig(doc.doc_type)?.category || (doc.doc_type.startsWith("community:") ? "Comunitario" : "Documento");
}

function getBrandHelper({ hasBrand, isPaid }: { hasBrand: boolean; isPaid: boolean }) {
  if (!isPaid) {
    return "Marca disponible en Pro";
  }

  return hasBrand ? "Datos corporativos configurados" : "Añade logo y datos corporativos";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES");
}
