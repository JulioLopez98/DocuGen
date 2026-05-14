import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDocumentRequests } from "@/components/AdminDocumentRequests";
import { EmptyState } from "@/components/EmptyState";
import { getDocumentConfig } from "@/lib/document-types";
import {
  createSupabaseServiceClient,
  getCurrentProfile,
  type CommunityDocumentTypeRow,
  type DocumentRequestRow,
} from "@/lib/supabase-server";

type AdminProfile = {
  id: string;
  email: string | null;
  plan: "free" | "pro" | "empresa";
  role: "user" | "admin";
  docs_this_month: number;
  created_at: string;
};

type AdminDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  doc_label: string;
  model_used: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
};

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const { supabase, profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const adminClient = createSupabaseServiceClient() || supabase;

  if (!adminClient) {
    redirect("/dashboard");
  }

  const now = new Date();
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);
  const last30Days = new Date(now);
  last30Days.setDate(now.getDate() - 30);

  const [
    profilesResult,
    documentsResult,
    totalUsersResult,
    totalDocumentsResult,
    docs7Result,
    docs30Result,
    events24Result,
    requestsResult,
    communityTypesResult,
  ] = await Promise.all([
    adminClient.from("profiles").select("id,email,plan,role,docs_this_month,created_at").order("created_at", { ascending: false }).returns<AdminProfile[]>(),
    adminClient.from("documents").select("id,user_id,doc_type,doc_label,model_used,tokens_input,tokens_output,created_at").order("created_at", { ascending: false }).limit(200).returns<AdminDocument[]>(),
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient.from("documents").select("id", { count: "exact", head: true }),
    adminClient.from("documents").select("id", { count: "exact", head: true }).gte("created_at", last7Days.toISOString()),
    adminClient.from("documents").select("id", { count: "exact", head: true }).gte("created_at", last30Days.toISOString()),
    adminClient.from("generation_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    adminClient.from("document_requests").select("*").order("created_at", { ascending: false }).limit(30).returns<DocumentRequestRow[]>(),
    adminClient.from("community_document_types").select("*").order("created_at", { ascending: false }).limit(20).returns<CommunityDocumentTypeRow[]>(),
  ]);

  const profiles = profilesResult.data || [];
  const documents = documentsResult.data || [];
  const documentRequests = requestsResult.data || [];
  const communityTypes = communityTypesResult.data || [];
  const planCounts = countPlans(profiles);
  const estimatedMrr = planCounts.pro * 9 + planCounts.empresa * 39;
  const popularTypes = getPopularTypes(documents).slice(0, 8);
  const recentDocuments = documents.slice(0, 8);
  const recentUsers = profiles.slice(0, 6);
  const totalTokens = documents.reduce((sum, doc) => sum + (doc.tokens_input || 0) + (doc.tokens_output || 0), 0);

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Admin</p>
          <h1 className="font-serif-display mt-3 text-4xl font-bold">Panel de administracion</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Vista interna con usuarios, actividad, documentos generados y senales de conversion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/catalogo-comunitario" className="focus-ring btn-primary px-4 py-3 text-sm">
            Catálogo comunitario
          </Link>
          <Link href="/dashboard" className="focus-ring btn-secondary px-4 py-3 text-sm">
            Volver al dashboard
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR estimado" value={`${estimatedMrr} EUR`} helper="Calculado por plan, no desde Stripe" />
        <MetricCard label="Usuarios" value={(totalUsersResult.count || 0).toString()} helper={`${planCounts.pro + planCounts.empresa} de pago`} />
        <MetricCard label="Documentos" value={(totalDocumentsResult.count || 0).toString()} helper={`${docs30Result.count || 0} en 30 dias`} />
        <MetricCard label="Eventos 24h" value={(events24Result.count || 0).toString()} helper="Generaciones registradas" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="surface rounded-md p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Planes</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Distribucion</h2>
            </div>
            <span className="rounded-full bg-[#d8f3dc] px-3 py-1 text-xs font-bold text-[#2d6a4f]">{profiles.length} perfiles leidos</span>
          </div>
          <div className="mt-6 grid gap-3">
            <PlanRow label="Free" count={planCounts.free} total={profiles.length} />
            <PlanRow label="Pro" count={planCounts.pro} total={profiles.length} />
            <PlanRow label="Empresa" count={planCounts.empresa} total={profiles.length} />
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <p className="eyebrow">Actividad</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Uso reciente</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SmallStat label="7 dias" value={(docs7Result.count || 0).toString()} />
            <SmallStat label="30 dias" value={(docs30Result.count || 0).toString()} />
            <SmallStat label="Tokens muestra" value={formatNumber(totalTokens)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Los tokens se calculan sobre los ultimos {documents.length} documentos cargados en esta vista.
          </p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface rounded-md p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Documentos</p>
              <h2 className="font-serif-display mt-3 text-3xl font-bold">Tipos populares</h2>
            </div>
            <Link href="/generar" className="btn-ghost px-3 py-2 text-sm">
              Ver catalogo
            </Link>
          </div>
          <div className="grid gap-3">
            {popularTypes.map((item) => (
              <div key={item.type} className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                  </div>
                  <span className="font-serif-display text-2xl font-bold text-[#2d6a4f]">{item.count}</span>
                </div>
              </div>
            ))}
            {popularTypes.length === 0 && (
              <EmptyState
                eyebrow="Sin documentos"
                title="Todavia no hay tipos populares"
                description="Cuando los usuarios generen documentos, aqui veras que categorias y tipos empiezan a traccionar."
                variant="flat"
                primaryAction={{ href: "/catalogo", label: "Ver catalogo" }}
              />
            )}
          </div>
        </section>

        <section className="surface rounded-md p-6">
          <p className="eyebrow">Usuarios</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Altas recientes</h2>
          <div className="mt-4 divide-y divide-[#d8f3dc]">
            {recentUsers.map((user) => (
              <article key={user.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{user.email || "Sin email"}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold capitalize text-[#2d6a4f]">{user.plan}</span>
                </div>
              </article>
            ))}
            {recentUsers.length === 0 && (
              <EmptyState
                eyebrow="Sin usuarios"
                title="Aun no hay altas registradas"
                description="Cuando entren los primeros usuarios, apareceran aqui con su plan y fecha de registro."
                variant="flat"
                primaryAction={{ href: "/dashboard", label: "Volver al dashboard" }}
              />
            )}
          </div>
        </section>
      </div>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Ultimos documentos</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Actividad reciente</h2>
          </div>
          <Link href="/historial" className="btn-ghost px-3 py-2 text-sm">
            Mi historial
          </Link>
        </div>
        <div className="divide-y divide-[#d8f3dc]">
          {recentDocuments.map((doc) => {
            const config = getDocumentConfig(doc.doc_type);

            return (
              <article key={doc.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{doc.doc_label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {config?.category || "Documento"} - {new Date(doc.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{doc.model_used || "sin modelo"}</span>
                    <span>{formatNumber((doc.tokens_input || 0) + (doc.tokens_output || 0))} tokens</span>
                  </div>
                </div>
              </article>
            );
          })}
          {recentDocuments.length === 0 && (
            <EmptyState
              eyebrow="Sin actividad"
              title="Todavia no hay documentos recientes"
              description="La actividad aparecera aqui cuando los usuarios empiecen a generar borradores."
              variant="flat"
              primaryAction={{ href: "/generar", label: "Crear documento de prueba" }}
            />
          )}
        </div>
      </section>

      <AdminDocumentRequests requests={documentRequests} communityTypes={communityTypes} />
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

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#d8f3dc] bg-white/72 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{label}</p>
      <p className="mt-2 font-serif-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function PlanRow({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-slate-500">
          {count} - {percent}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#d8f3dc]">
        <div className="h-full rounded-full bg-[#2d6a4f]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function countPlans(profiles: AdminProfile[]) {
  return profiles.reduce(
    (counts, item) => {
      counts[item.plan] += 1;
      return counts;
    },
    { free: 0, pro: 0, empresa: 0 },
  );
}

function getPopularTypes(documents: AdminDocument[]) {
  const counts = new Map<string, number>();

  for (const doc of documents) {
    counts.set(doc.doc_type, (counts.get(doc.doc_type) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => {
      const config = getDocumentConfig(type);
      return {
        type,
        count,
        label: config?.label || type,
        category: config?.category || "Documento",
      };
    })
    .sort((a, b) => b.count - a.count);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}
