import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingStatusNotice } from "@/components/BillingStatusNotice";
import { BrandSettingsForm } from "@/components/BrandSettingsForm";
import { DangerZone } from "@/components/DangerZone";
import { EmptyState } from "@/components/EmptyState";
import { PlanBadge } from "@/components/PlanBadge";
import { SettingsTabs } from "@/components/SettingsTabs";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { getCurrentProfile, type BrandSettings } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Ajustes",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SettingsPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!supabase || !user || !profile) {
    redirect("/auth");
  }

  const [{ data: brandSettings }, { count: documentCount }] = await Promise.all([
    supabase.from("brand_settings").select("*").eq("user_id", user.id).maybeSingle<BrandSettings>(),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const isPro = profile.plan !== "free";
  const remaining = Math.max(3 - profile.docs_this_month, 0);
  const hasBrand = Boolean(brandSettings?.company_name || brandSettings?.cif || brandSettings?.address || brandSettings?.logo_url);

  return (
    <section className="container-page py-8 lg:py-10">
      <div className="surface mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="eyebrow">Ajustes</p>
            <h1 className="section-title mt-3 max-w-4xl">Administra tu cuenta profesional</h1>
            <p className="body-muted mt-4 max-w-3xl">
              Controla plan, uso, exportaciones, identidad de marca y datos guardados desde una zona pensada para dejar
              DocuGen listo para trabajar.
            </p>
          </div>
          <div className="surface-muted p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#2d6a4f]">Estado de cuenta</p>
              <PlanBadge plan={profile.plan} />
            </div>
            <p className="body-muted mt-3">
              {isPro
                ? "Tu plan permite uso avanzado, Word, plantillas y marca."
                : `Te quedan ${remaining} documentos gratuitos este mes.`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <Link href="/dashboard" className="focus-ring btn-secondary px-4 py-3 text-sm">
          Volver al panel
        </Link>
      </div>

      <SettingsTabs
        sections={[
          {
            id: "cuenta",
            label: "Cuenta",
            description: "Email, plan y uso mensual",
            content: (
              <section className="surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Cuenta</p>
                    <h2 className="panel-title mt-3">Tu cuenta</h2>
                    <p className="body-muted mt-2">{user.email}</p>
                  </div>
                  <PlanBadge plan={profile.plan} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <AccountFact label="Plan" value={profile.plan} />
                  <AccountFact label="Documentos este mes" value={profile.docs_this_month.toString()} />
                  <AccountFact label="Documentos" value={`${documentCount || 0}`} />
                </div>

                <div className="mt-6">
                  <UsageBar used={profile.docs_this_month} plan={profile.plan} />
                </div>
                <p className="status-note mt-4">
                  {isPro ? "Tu plan incluye documentos ilimitados." : `Te quedan ${remaining} documentos gratuitos este mes.`}
                </p>
              </section>
            ),
          },
          {
            id: "suscripcion",
            label: "SuscripciÃ³n",
            description: "Stripe y formatos",
            content: (
              <div className="grid gap-4">
                <section className="surface p-6">
                  <p className="eyebrow">SuscripciÃ³n</p>
                  <h2 className="panel-title mt-3">Plan y facturaciÃ³n</h2>
                  <p className="body-muted mt-3">
                    Actualiza a Pro o gestiona tu suscripciÃ³n desde el portal seguro de Stripe.
                  </p>
                  <div className="mt-6">
                    <SubscriptionActions
                      plan={profile.plan}
                      hasCustomer={Boolean(profile.stripe_customer_id)}
                      hasManagedSubscription={hasManagedStripeSubscription(profile)}
                      cancelAtPeriodEnd={profile.stripe_cancel_at_period_end}
                      currentPeriodEnd={profile.stripe_current_period_end}
                    />
                  </div>
                  <div className="mt-5">
                    <BillingStatusNotice profile={profile} />
                  </div>
                  <Link href="/precios" className="mt-4 inline-flex text-sm font-semibold text-[#2d6a4f]">
                    Comparar planes
                  </Link>
                </section>

                <section className="surface p-6">
                  <p className="eyebrow">Exportaciones</p>
                  <h2 className="panel-title mt-3">Formatos disponibles</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <ExportFormat title="PDF" status="Incluido" active />
                    <ExportFormat title="TXT" status="Incluido" active />
                    <ExportFormat title="Word" status={isPro ? "Incluido en Pro" : "Solo Pro"} active={isPro} />
                  </div>
                </section>
              </div>
            ),
          },
          {
            id: "marca",
            label: "Marca",
            description: hasBrand ? "Identidad configurada" : "Logo y datos Pro",
            content: <BrandSettingsForm initialSettings={brandSettings || null} userId={user.id} isPro={isPro} />,
          },
          {
            id: "datos",
            label: "Datos",
            description: "Documentos y limpieza",
            content: (
              <div className="grid gap-4">
                <section className="surface p-6">
                  <p className="eyebrow">Datos</p>
                  <h2 className="panel-title mt-3">Documentos guardados</h2>
                  {documentCount ? (
                    <>
                      <p className="body-muted mt-3">
                        Tienes <strong>{documentCount}</strong> documentos guardados. Puedes consultarlos,
                        descargarlos o reutilizarlos como plantilla.
                      </p>
                      <Link href="/historial" className="focus-ring btn-secondary mt-6 px-4 py-3 text-sm">
                        Abrir documentos
                      </Link>
                    </>
                  ) : (
                    <div className="mt-5">
                      <EmptyState
                        eyebrow="Documentos vacÃ­os"
                        title="AÃºn no hay documentos que gestionar"
                        description="Cuando generes tu primer borrador, esta secciÃ³n te permitirÃ¡ revisar documentos y limpiar tus datos."
                        variant="flat"
                        primaryAction={{ href: "/generar", label: "Crear primer documento" }}
                        secondaryAction={{ href: "/catalogo", label: "Ver tipos de documento" }}
                      />
                    </div>
                  )}
                </section>
                <DangerZone />
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}

function hasManagedStripeSubscription(profile: { stripe_subscription_id: string | null; stripe_subscription_status: string | null }) {
  return Boolean(
    profile.stripe_subscription_id ||
      (profile.stripe_subscription_status && ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status)),
  );
}
function ExportFormat({ title, status, active }: { title: string; status: string; active: boolean }) {
  return (
    <div className={`interactive-subtle rounded-md border p-4 ${active ? "border-[#d8f3dc] bg-[#faf9f6]" : "border-slate-200 bg-slate-50"}`}>
      <p className="font-semibold">{title}</p>
      <p className={`mt-2 text-xs font-semibold ${active ? "text-[#2d6a4f]" : "text-slate-500"}`}>{status}</p>
    </div>
  );
}

function AccountFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-flat interactive-subtle p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif-display text-2xl font-bold capitalize">{value}</p>
    </div>
  );
}
