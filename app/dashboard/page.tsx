import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingStatusNotice } from "@/components/BillingStatusNotice";
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
    <section className="container-page py-8 lg:py-10">
      <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr] lg:items-stretch">
        <section className="surface relative overflow-hidden p-7 lg:p-8">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-[#d8f3dc]/55" aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow">Centro de control</p>
            <h1 className="section-title mt-3 max-w-3xl">Hola, {displayName}. ¿Qué quieres preparar hoy?</h1>
            <p className="body-muted mt-4 max-w-2xl">
              Crea un documento desde el catálogo, continúa uno anterior o usa plantillas y funciones avanzadas cuando
              necesites más control.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/generar" className="focus-ring btn-primary px-5 py-3 text-sm">
                Crear documento
              </Link>
              {!lastDocument && (
                <Link href="/onboarding" className="focus-ring btn-secondary px-5 py-3 text-sm">
                  Empezar guiado
                </Link>
              )}
              <Link href={lastDocument ? `/historial/${lastDocument.id}` : "/historial"} className="focus-ring btn-secondary px-5 py-3 text-sm">
                {lastDocument ? "Continuar último" : "Ver documentos"}
              </Link>
              <Link href={isPaid ? "/plantillas" : "/precios"} className="focus-ring btn-ghost px-5 py-3 text-sm">
                {isPaid ? "Plantillas" : "Ver Pro"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <QuickAction
                href="/generar"
                eyebrow="Más usado"
                label="Crear desde catálogo"
                text="Busca por categoría o intención y genera un borrador guiado."
              />
              <QuickAction
                href={isPaid ? "/generar?mode=custom" : "/precios"}
                eyebrow={isPaid ? "Pro" : "Bloqueado"}
                label="Pedir a medida"
                text={isPaid ? "Describe un documento si no existe en el catálogo." : "Desbloquea documentos libres con Pro."}
              />
              <QuickAction
                href="/historial"
                eyebrow="Biblioteca"
                label="Reutilizar documento"
                text="Abre, mejora, versiona o usa un documento como base."
              />
            </div>
          </div>
        </section>

        <aside className="surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Tu plan</p>
              <h2 className="mt-2 font-serif-display text-2xl font-bold">Estado de uso</h2>
              <p className="mt-1 text-xs text-slate-500">Plan, límites y suscripción</p>
            </div>
            <PlanBadge plan={profile.plan} />
          </div>

          <div className="mt-6">
            <UsageBar used={profile.docs_this_month} plan={profile.plan} />
          </div>

          <p className={`mt-4 ${isFree && remaining === 0 ? "status-warning" : "status-note"}`}>
            {isFree
              ? remaining > 0
                ? `Te quedan ${remaining} documentos gratuitos este mes.`
                : "Has agotado tus documentos gratuitos este mes."
              : "Generaciones ilimitadas activas en tu plan."}
          </p>

          <div className="mt-5">
            <SubscriptionActions
              plan={profile.plan}
              hasCustomer={Boolean(profile.stripe_customer_id)}
              hasManagedSubscription={hasManagedStripeSubscription(profile)}
              cancelAtPeriodEnd={profile.stripe_cancel_at_period_end}
              currentPeriodEnd={profile.stripe_current_period_end}
            />
          </div>

          <div className="mt-5">
            <BillingStatusNotice profile={profile} variant="compact" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric label="Guardados" value={allDocuments.length.toString()} />
            <MiniMetric label="Este mes" value={profile.docs_this_month.toString()} />
          </div>

          <Link href="/precios" className="focus-ring btn-secondary mt-5 w-full px-4 py-3 text-sm">
            Comparar planes
          </Link>
        </aside>
      </div>

      {isFree && (
        <section className="surface-flat mt-5 border-[#2d6a4f] bg-[#f4fbf5] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Prueba Free</p>
              <h2 className="mt-2 text-xl font-bold">
                {remaining > 0 ? `Te quedan ${remaining} documentos para validar DocuGen` : "Has llegado al límite Free este mes"}
              </h2>
              <p className="body-muted mt-2 max-w-2xl text-sm">
                {remaining > 0
                  ? "Crea un borrador real, exporta PDF/TXT y comprueba si el flujo te ahorra tiempo antes de pasar a Pro."
                  : "Pro desbloquea documentos ilimitados, Word, plantillas, marca y documentos a medida."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {remaining > 0 && (
                <Link href="/generar" className="focus-ring btn-primary px-4 py-3 text-sm">
                  Usar documento Free
                </Link>
              )}
              <Link href="/precios" className="focus-ring btn-secondary px-4 py-3 text-sm">
                Ver Pro
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.86fr]">
        <div className="surface p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Primeros pasos</p>
              <h2 className="panel-title mt-3">Tu siguiente mejor paso</h2>
              <p className="body-muted mt-2 max-w-2xl">Una ruta corta para usar DocuGen sin perderte entre funciones avanzadas.</p>
            </div>
            <Link href="/onboarding" className="focus-ring btn-secondary px-4 py-2 text-sm">
              Ver onboarding
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {onboardingSteps.map((step, index) => (
              <OnboardingStepCard key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        </div>

        <div className="grid gap-5">
          <DashboardStat label="Marca" value={hasBrand ? "Lista" : isPaid ? "Pendiente" : "Pro"} helper={getBrandHelper({ hasBrand, isPaid })} />
          <DashboardStat
            label="Workspace"
            value={isEmpresa ? "Activo" : "Empresa"}
            helper={isEmpresa ? "Equipo, roles y documentos compartidos" : "Disponible al actualizar a Empresa"}
          />
        </div>
      </section>

      <div className="mt-5">
        <PlanFirstSteps
          plan={profile.plan}
          context={profile.plan === "empresa" ? "team" : profile.plan === "pro" ? "templates" : "documents"}
        />
      </div>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <ContextualHelp
          title="Crear rápido"
          description="El camino principal: catálogo, datos, borrador y exportación."
          items={["Elige un tipo documental.", "Completa solo los campos necesarios.", "Revisa antes de usar."]}
          primaryAction={{ href: "/generar", label: "Crear ahora" }}
        />
        <ContextualHelp
          title="Usar ejemplos propios"
          description="Las plantillas ayudan a orientar estructura y tono sin copiar datos sensibles."
          items={isPaid ? ["Sube DOCX/PDF.", "Procesa la plantilla.", "Úsala como referencia."] : ["Disponible en Pro.", "Ideal para mantener estilo propio."]}
          primaryAction={{ href: isPaid ? "/plantillas" : "/precios", label: isPaid ? "Abrir plantillas" : "Ver Pro" }}
          tone="pro"
        />
        <ContextualHelp
          title="Trabajar en equipo"
          description="Empresa añade miembros, documentos compartidos, invitaciones y actividad."
          items={isEmpresa ? ["Invita miembros.", "Comparte documentos.", "Revisa actividad."] : ["Disponible en Empresa.", "Pensado para equipos."]}
          primaryAction={{ href: isEmpresa ? "/workspace" : "/precios", label: isEmpresa ? "Abrir equipo" : "Ver Empresa" }}
          tone="empresa"
        />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
        <section className="surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Continuar</p>
              <h2 className="panel-title mt-3">Trabajo reciente</h2>
            </div>
            <Link href="/historial" className="focus-ring btn-ghost px-3 py-2 text-sm">
              Ver todo
            </Link>
          </div>

          {lastDocument ? (
            <div className="surface-muted p-5">
              <p className="eyebrow">Último documento</p>
              <h3 className="mt-2 text-xl font-bold">{lastDocument.doc_label}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {formatDate(lastDocument.created_at)} · {getDocumentCategory(lastDocument)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/historial/${lastDocument.id}`} className="focus-ring btn-primary px-4 py-2 text-sm">
                  Abrir documento
                </Link>
                <Link href={`/generar?templateId=${lastDocument.id}`} className="focus-ring btn-secondary px-4 py-2 text-sm">
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
            <div className="mt-4 grid gap-2">
              {recentDocuments.slice(1).map((doc) => (
                <article key={doc.id} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-white/72 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{doc.doc_label}</h3>
                      <p className="text-xs text-slate-500">
                        {formatDate(doc.created_at)} · {getDocumentCategory(doc)}
                      </p>
                    </div>
                    <Link href={`/historial/${doc.id}`} className="focus-ring btn-secondary px-3 py-2 text-xs">
                      Ver
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="surface p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Recomendado</p>
              <h2 className="panel-title mt-3">Documentos útiles para empezar</h2>
            </div>
            <Link href="/catalogo" className="focus-ring btn-ghost px-3 py-2 text-sm">
              Catálogo completo
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedDocuments.map((doc) => (
              <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</p>
                  {requiresPro(doc) && <span className="badge badge-pro">Pro</span>}
                </div>
                <h3 className="mt-2 font-semibold">{doc.label}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{doc.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function hasManagedStripeSubscription(profile: { stripe_subscription_id: string | null; stripe_subscription_status: string | null }) {
  return Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
}
function QuickAction({ href, eyebrow, label, text }: { href: string; eyebrow: string; label: string; text: string }) {
  return (
    <Link href={href} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-white/70 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{eyebrow}</p>
      <p className="mt-2 font-bold">{label}</p>
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
    <Link
      href={href}
      className={`interactive-subtle rounded-md border p-4 ${
        done ? "border-[#2d6a4f] bg-[#d8f3dc]/45" : "border-[#d8f3dc] bg-white/75"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">{index}</span>
        <span className={done ? "badge badge-free" : "badge bg-[#faf9f6] text-slate-500"}>{done ? "Hecho" : "Pendiente"}</span>
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="body-muted mt-2">{text}</p>
      <span className="mt-3 inline-flex text-sm font-bold text-[#2d6a4f]">{action}</span>
    </Link>
  );
}

function DashboardStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="surface-flat p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-serif-display text-3xl font-bold text-[#2d6a4f]">{value}</p>
      <p className="body-muted mt-2 text-xs">{helper}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-serif-display text-2xl font-bold text-[#2d6a4f]">{value}</p>
    </div>
  );
}

function EmptyPanel({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-[#d8f3dc] bg-[#faf9f6]/70 p-6">
      <p className="text-sm font-bold">{title}</p>
      <p className="body-muted mt-2">{text}</p>
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
