import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandSettingsForm } from "@/components/BrandSettingsForm";
import { DangerZone } from "@/components/DangerZone";
import { PlanBadge } from "@/components/PlanBadge";
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

  return (
    <section className="container-page py-10">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Ajustes</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">Cuenta y marca</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gestiona tu plan, tus exportaciones y los datos de marca que acompanan a tus documentos profesionales.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface rounded-md p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Cuenta</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Tu cuenta</h2>
              <p className="mt-2 text-sm text-slate-600">{user.email}</p>
            </div>
            <PlanBadge plan={profile.plan} />
          </div>

          <div className="mt-6">
            <UsageBar used={profile.docs_this_month} plan={profile.plan} />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            {isPro ? "Tu plan incluye documentos ilimitados." : `Te quedan ${remaining} documentos gratuitos este mes.`}
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
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Documentos guardados en historial: <strong>{documentCount || 0}</strong>.
          </p>
        </section>
      </div>

      <div className="mt-4">
        <BrandSettingsForm initialSettings={brandSettings || null} userId={user.id} isPro={isPro} />
      </div>

      <div className="mt-4">
        <DangerZone />
      </div>
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
