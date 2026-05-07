import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanBadge } from "@/components/PlanBadge";
import { SubscriptionActions } from "@/components/SubscriptionActions";
import { UsageBar } from "@/components/UsageBar";
import { documentTypes, getDocumentConfig } from "@/lib/document-types";
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
    .limit(50)
    .returns<DocumentRow[]>();

  const allDocuments = documents || [];
  const recentDocuments = allDocuments.slice(0, 5);
  const remaining = Math.max(3 - profile.docs_this_month, 0);
  const isFree = profile.plan === "free";
  const mostUsedTypes = getMostUsedTypes(allDocuments);

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Tu espacio DocuGen</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Controla tu uso, retoma documentos recientes y empieza nuevos borradores sin pasar por la landing.
          </p>
        </div>
        <Link href="/generar" className="focus-ring btn-primary px-4 py-2 text-sm">
          Generar documento
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Documentos guardados" value={allDocuments.length.toString()} helper="En tu historial actual" />
        <MetricCard
          label="Generados este mes"
          value={profile.docs_this_month.toString()}
          helper={isFree ? `${remaining} restantes en Free` : "Sin límite mensual en Pro"}
        />
        <MetricCard
          label="Tipo más usado"
          value={mostUsedTypes[0]?.label || "Sin datos"}
          helper={mostUsedTypes[0] ? `${mostUsedTypes[0].count} documentos` : "Genera tu primer borrador"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface rounded-md p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Plan actual</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isFree ? "Plan gratuito para empezar con documentos puntuales." : "Plan activo con documentos ilimitados."}
              </p>
            </div>
            <PlanBadge plan={profile.plan} />
          </div>

          <div className="mt-6">
            <UsageBar used={profile.docs_this_month} plan={profile.plan} />
          </div>

          {isFree && (
            <p className="mt-4 text-sm text-slate-600">
              Te quedan <strong>{remaining}</strong> documentos gratuitos este mes.
            </p>
          )}
          {isFree && remaining === 0 && (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              Has alcanzado el límite de 3 documentos gratuitos este mes.
            </p>
          )}
          {!isFree && (
            <p className="mt-4 rounded-md bg-[#d8f3dc] p-3 text-sm font-medium text-[#1f2933]">
              Tu cuenta está en Pro. Puedes generar documentos sin límite mensual.
            </p>
          )}

          <div className="mt-6">
            <SubscriptionActions plan={profile.plan} hasCustomer={Boolean(profile.stripe_customer_id)} />
          </div>
          <Link href="/precios" className="mt-4 inline-flex text-sm font-semibold text-[#2d6a4f]">
            Comparar planes
          </Link>
        </section>

        <section className="surface rounded-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Historial reciente</h2>
              <p className="mt-1 text-sm text-slate-600">Últimos borradores generados.</p>
            </div>
            <Link href="/historial" className="btn-ghost px-3 py-2 text-sm">
              Ver todo
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[#d8f3dc]">
            {recentDocuments.map((doc) => (
              <article key={doc.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{doc.doc_label}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString("es-ES")} · {getDocumentConfig(doc.doc_type)?.category}
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
            {recentDocuments.length === 0 && <p className="py-4 text-sm text-slate-600">Aún no has generado documentos.</p>}
          </div>
        </section>
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Acciones rápidas</h2>
            <p className="mt-1 text-sm text-slate-600">Empieza por los documentos más habituales.</p>
          </div>
          <Link href="/generar" className="btn-ghost px-3 py-2 text-sm">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {documentTypes.slice(0, 8).map((doc) => (
            <Link key={doc.type} href={`/generar?type=${doc.type}`} className="surface-flat interactive rounded-md p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2d6a4f]">{doc.category}</p>
              <h3 className="mt-2 font-semibold">{doc.label}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{doc.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface mt-4 rounded-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Marca personalizada</h2>
            <p className="mt-1 text-sm text-slate-600">
              Configura datos corporativos y logo para exportaciones Word y futuras plantillas de marca.
            </p>
          </div>
          <Link href="/ajustes" className="focus-ring btn-secondary px-4 py-2 text-sm">
            Abrir ajustes
          </Link>
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
