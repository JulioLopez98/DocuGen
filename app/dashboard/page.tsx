import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanBadge } from "@/components/PlanBadge";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { getCurrentProfile, type DocumentRow } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!supabase || !profile) {
    redirect("/auth");
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<DocumentRow[]>();

  const remaining = Math.max(3 - profile.docs_this_month, 0);

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">Dashboard</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Tu espacio DocuGen</h1>
        </div>
        <Link href="/generar" className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white">
          Generar documento
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-md border border-[#d8f3dc] bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Plan actual</h2>
            <PlanBadge plan={profile.plan} />
          </div>
          <div className="mt-6">
            <UsageBar used={profile.docs_this_month} plan={profile.plan} />
          </div>
          {profile.plan === "free" && (
            <p className="mt-4 text-sm text-slate-600">
              Te quedan <strong>{remaining}</strong> documentos gratuitos este mes.
            </p>
          )}
          {profile.plan === "free" && remaining === 0 && (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              Has alcanzado el límite de 3 documentos gratuitos este mes.
            </p>
          )}
          <div className="mt-6">
            <SubscriptionActions showPortal={profile.plan !== "free"} />
          </div>
        </section>

        <section className="rounded-md border border-[#d8f3dc] bg-white p-6">
          <h2 className="text-xl font-bold">Historial reciente</h2>
          <div className="mt-4 divide-y divide-[#d8f3dc]">
            {(documents || []).map((doc) => (
              <article key={doc.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{doc.doc_label}</h3>
                    <p className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                  <Link
                    href={`/generar?type=${doc.doc_type}`}
                    className="rounded-md border border-[#2d6a4f] px-3 py-2 text-xs font-semibold text-[#2d6a4f]"
                  >
                    Regenerar
                  </Link>
                </div>
              </article>
            ))}
            {(!documents || documents.length === 0) && (
              <p className="py-4 text-sm text-slate-600">Aún no has generado documentos.</p>
            )}
          </div>
          <Link href="/historial" className="mt-4 inline-flex text-sm font-semibold text-[#2d6a4f]">
            Ver historial completo
          </Link>
        </section>
      </div>
    </section>
  );
}
