import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandSettingsForm } from "@/components/BrandSettingsForm";
import { DangerZone } from "@/components/DangerZone";
import { PlanBadge } from "@/components/PlanBadge";
import { SettingsTabs } from "@/components/SettingsTabs";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { getCurrentProfile, type BrandSettings } from "@/lib/supabase-server";

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
    <section className="container-page py-10">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow">Ajustes</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Cuenta, plan y marca</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gestiona tu cuenta, suscripcion, exportaciones, marca personalizada y datos guardados.
          </p>
        </div>
        <Link href="/dashboard" className="focus-ring btn-secondary px-4 py-3 text-sm">
          Volver al dashboard
        </Link>
      </div>

      <SettingsTabs
        sections={[
          {
            id: "cuenta",
            label: "Cuenta",
            description: "Email, plan y uso",
            content: (
              <section className="surface rounded-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Cuenta</p>
                    <h2 className="font-serif-display mt-3 text-3xl font-bold">Tu cuenta</h2>
                    <p className="mt-2 text-sm text-slate-600">{user.email}</p>
                  </div>
                  <PlanBadge plan={profile.plan} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <AccountFact label="Plan" value={profile.plan} />
                  <AccountFact label="Documentos este mes" value={profile.docs_this_month.toString()} />
                  <AccountFact label="Historial" value={`${documentCount || 0}`} />
                </div>

                <div className="mt-6">
                  <UsageBar used={profile.docs_this_month} plan={profile.plan} />
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {isPro ? "Tu plan incluye documentos ilimitados." : `Te quedan ${remaining} documentos gratuitos este mes.`}
                </p>
              </section>
            ),
          },
          {
            id: "suscripcion",
            label: "Suscripcion",
            description: "Stripe y formatos",
            content: (
              <div className="grid gap-4">
                <section className="surface rounded-md p-6">
                  <p className="eyebrow">Suscripcion</p>
                  <h2 className="font-serif-display mt-3 text-3xl font-bold">Plan y facturacion</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Actualiza a Pro o gestiona tu suscripcion desde el portal seguro de Stripe.
                  </p>
                  <div className="mt-6">
                    <SubscriptionActions plan={profile.plan} hasCustomer={Boolean(profile.stripe_customer_id)} />
                  </div>
                  <Link href="/precios" className="mt-4 inline-flex text-sm font-semibold text-[#2d6a4f]">
                    Comparar planes
                  </Link>
                </section>

                <section className="surface rounded-md p-6">
                  <p className="eyebrow">Exportaciones</p>
                  <h2 className="font-serif-display mt-3 text-3xl font-bold">Formatos disponibles</h2>
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
            description: "Historial y limpieza",
            content: (
              <div className="grid gap-4">
                <section className="surface rounded-md p-6">
                  <p className="eyebrow">Datos</p>
                  <h2 className="font-serif-display mt-3 text-3xl font-bold">Documentos guardados</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Tienes <strong>{documentCount || 0}</strong> documentos en tu historial. Puedes consultarlos,
                    descargarlos o reutilizarlos como plantilla.
                  </p>
                  <Link href="/historial" className="focus-ring btn-secondary mt-6 px-4 py-3 text-sm">
                    Abrir historial
                  </Link>
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

function ExportFormat({ title, status, active }: { title: string; status: string; active: boolean }) {
  return (
    <div className={`rounded-md border p-4 ${active ? "border-[#d8f3dc] bg-[#faf9f6]" : "border-slate-200 bg-slate-50"}`}>
      <p className="font-semibold">{title}</p>
      <p className={`mt-2 text-xs font-semibold ${active ? "text-[#2d6a4f]" : "text-slate-500"}`}>{status}</p>
    </div>
  );
}

function AccountFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-2 font-serif-display text-2xl font-bold capitalize">{value}</p>
    </div>
  );
}
