import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDocumentRequests } from "@/components/AdminDocumentRequests";
import { AdminOperationalAlerts } from "@/components/AdminOperationalAlerts";
import { EmptyState } from "@/components/EmptyState";
import type { ApiErrorEventRow } from "@/lib/api-error-monitor";
import { getDocumentConfig } from "@/lib/document-types";
import { runInternalHealthChecks, type HealthCheckReport, type HealthCheckStatus } from "@/lib/health-checks";
import {
  createSupabaseServiceClient,
  getCurrentProfile,
  type CommunityDocumentTypeRow,
  type DocumentRequestRow,
  type WorkspaceAuditEventRow,
} from "@/lib/supabase-server";
import type { RateLimitAction } from "@/lib/rate-limit";
import type { OperationalAlertRow } from "@/lib/operational-alerts";
import type { SecurityEventRow } from "@/lib/security-events";

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

type AdminRateLimitEvent = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  action: RateLimitAction;
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
    rateLimitEventsResult,
    securityEventsResult,
    auditEventsResult,
    operationalAlertsResult,
    apiErrorEventsResult,
    healthReport,
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
    adminClient
      .from("rate_limit_events")
      .select("id,user_id,workspace_id,action,created_at")
      .order("created_at", { ascending: false })
      .limit(80)
      .returns<AdminRateLimitEvent[]>(),
    adminClient.from("security_events").select("*").order("created_at", { ascending: false }).limit(40).returns<SecurityEventRow[]>(),
    adminClient
      .from("workspace_audit_events")
      .select("*")
      .in("event_type", ["member_invited", "member_role_updated", "member_permissions_updated", "member_removed", "invitation_revoked"])
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<WorkspaceAuditEventRow[]>(),
    adminClient
      .from("operational_alerts")
      .select("*")
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<OperationalAlertRow[]>(),
    adminClient
      .from("api_error_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ApiErrorEventRow[]>(),
    runInternalHealthChecks(adminClient),
  ]);

  const profiles = profilesResult.data || [];
  const documents = documentsResult.data || [];
  const documentRequests = requestsResult.data || [];
  const communityTypes = communityTypesResult.data || [];
  const rateLimitEvents = rateLimitEventsResult.data || [];
  const securityEvents = securityEventsResult.data || [];
  const sensitiveAuditEvents = auditEventsResult.data || [];
  const operationalAlerts = operationalAlertsResult.data || [];
  const apiErrorEvents = apiErrorEventsResult.data || [];
  const planCounts = countPlans(profiles);
  const estimatedMrr = planCounts.pro * 9 + planCounts.empresa * 39;
  const popularTypes = getPopularTypes(documents).slice(0, 8);
  const recentDocuments = documents.slice(0, 8);
  const recentUsers = profiles.slice(0, 6);
  const totalTokens = documents.reduce((sum, doc) => sum + (doc.tokens_input || 0) + (doc.tokens_output || 0), 0);
  const profileById = new Map(profiles.map((item) => [item.id, item]));
  const rateLimitSummary = getRateLimitSummary(rateLimitEvents);
  const highSeverityCount = securityEvents.filter((event) => event.severity === "high").length;

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
            Tipos comunitarios
          </Link>
          <Link href="/dashboard" className="focus-ring btn-secondary px-4 py-3 text-sm">
            Volver al panel
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR estimado" value={`${estimatedMrr} EUR`} helper="Calculado por plan, no desde Stripe" />
        <MetricCard label="Usuarios" value={(totalUsersResult.count || 0).toString()} helper={`${planCounts.pro + planCounts.empresa} de pago`} />
        <MetricCard label="Documentos" value={(totalDocumentsResult.count || 0).toString()} helper={`${docs30Result.count || 0} en 30 dias`} />
        <MetricCard label="Eventos 24h" value={(events24Result.count || 0).toString()} helper="Generaciones registradas" />
      </div>

      <AdminHealthChecks report={healthReport} />

      <AdminOperationalAlerts alerts={operationalAlerts} profiles={profiles} />

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">APIs</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Errores monitorizados</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Fallos recientes de OpenAI, Stripe, Resend, Supabase y errores internos registrados por servidor.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SmallStat label="Total" value={apiErrorEvents.length.toString()} />
            <SmallStat label="Criticos" value={apiErrorEvents.filter((event) => event.severity === "high").length.toString()} />
            <SmallStat label="Proveedores" value={new Set(apiErrorEvents.map((event) => event.provider)).size.toString()} />
          </div>
        </div>

        <div className="divide-y divide-[#d8f3dc]">
          {apiErrorEvents.slice(0, 10).map((event) => (
            <article key={event.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${getSeverityClass(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold text-[#2d6a4f]">
                      {event.provider}
                    </span>
                    <span className="rounded-full border border-[#d8f3dc] px-2 py-1 text-xs text-slate-600">
                      {event.error_code}
                    </span>
                  </div>
                  <p className="mt-3 font-semibold">{event.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.route} - {new Date(event.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {event.user_id ? profileById.get(event.user_id)?.email || "Usuario" : "Sistema"}
                </span>
              </div>
            </article>
          ))}
          {apiErrorEvents.length === 0 && (
            <EmptyState
              eyebrow="Sin errores"
              title="No hay errores de APIs registrados"
              description="Cuando falle un proveedor externo o una ruta critica, aparecera aqui."
              variant="flat"
              primaryAction={{ href: "/admin", label: "Actualizar panel" }}
            />
          )}
        </div>
      </section>

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Eventos sensibles</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Bloqueos por rate limit, actividad sensible de equipos y senales que conviene revisar si aparecen picos.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SmallStat label="Bloqueos" value={securityEvents.length.toString()} />
            <SmallStat label="Alta severidad" value={highSeverityCount.toString()} />
            <SmallStat label="Rate events" value={rateLimitEvents.length.toString()} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4">
            <h3 className="font-serif-display text-2xl font-bold">Acciones con mas actividad</h3>
            <div className="mt-4 grid gap-3">
              {rateLimitSummary.map((item) => (
                <div key={item.action} className="flex items-center justify-between gap-4 rounded-md bg-[#faf9f6] p-3">
                  <div>
                    <p className="font-semibold">{formatActionLabel(item.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.uniqueUsers} usuarios distintos</p>
                  </div>
                  <span className="font-serif-display text-2xl font-bold text-[#2d6a4f]">{item.count}</span>
                </div>
              ))}
              {rateLimitSummary.length === 0 && (
                <EmptyState
                  eyebrow="Sin senales"
                  title="No hay eventos de rate limit recientes"
                  description="Cuando haya actividad suficiente o bloqueos, apareceran aqui por tipo de accion."
                  variant="flat"
                  primaryAction={{ href: "/admin", label: "Actualizar panel" }}
                />
              )}
            </div>
          </div>

          <div className="rounded-md border border-[#d8f3dc] bg-white/70 p-4">
            <h3 className="font-serif-display text-2xl font-bold">Ultimos eventos bloqueados</h3>
            <div className="mt-4 divide-y divide-[#d8f3dc]">
              {securityEvents.slice(0, 8).map((event) => (
                <SecurityEventItem key={event.id} event={event} profile={event.user_id ? profileById.get(event.user_id) : undefined} />
              ))}
              {securityEvents.length === 0 && (
                <EmptyState
                  eyebrow="Sin bloqueos"
                  title="Aun no hay eventos de seguridad"
                  description="Los rate limits bloqueados y futuras senales de abuso se registraran aqui."
                  variant="flat"
                  primaryAction={{ href: "/dashboard", label: "Volver al panel" }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

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
              Ver tipos
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
                primaryAction={{ href: "/catalogo", label: "Ver tipos" }}
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
                primaryAction={{ href: "/dashboard", label: "Volver al panel" }}
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
            Mis documentos
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

      <section className="surface mt-4 rounded-md p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Empresa</p>
            <h2 className="font-serif-display mt-3 text-3xl font-bold">Actividad sensible de equipos</h2>
          </div>
          <Link href="/workspace" className="btn-ghost px-3 py-2 text-sm">
            Ver equipo
          </Link>
        </div>
        <div className="divide-y divide-[#d8f3dc]">
          {sensitiveAuditEvents.slice(0, 10).map((event) => (
            <article key={event.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{event.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatWorkspaceEventLabel(event.event_type)} - {new Date(event.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <span className="rounded-full bg-[#d8f3dc] px-2 py-1 text-xs font-bold text-[#2d6a4f]">
                  {event.actor_id ? profileById.get(event.actor_id)?.email || "Usuario" : "Sistema"}
                </span>
              </div>
            </article>
          ))}
          {sensitiveAuditEvents.length === 0 && (
            <EmptyState
              eyebrow="Sin cambios sensibles"
              title="No hay actividad reciente de roles o invitaciones"
              description="Cuando un equipo cambie miembros, roles o invitaciones, se vera aqui."
              variant="flat"
              primaryAction={{ href: "/workspace", label: "Ir a Empresa" }}
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

function AdminHealthChecks({ report }: { report: HealthCheckReport }) {
  const summary = countHealthStatuses(report);

  return (
    <section className="surface mt-4 rounded-md p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Health checks</p>
          <h2 className="font-serif-display mt-3 text-3xl font-bold">Estado interno</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Comprobacion rapida de variables, tablas criticas y proveedores necesarios para operar DocuGen.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <SmallStat label="OK" value={summary.ok.toString()} />
          <SmallStat label="Avisos" value={summary.warning.toString()} />
          <SmallStat label="Errores" value={summary.error.toString()} />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        {report.groups.map((group) => (
          <div key={group.id} className="rounded-md border border-[#d8f3dc] bg-white/75 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif-display text-xl font-bold">{group.label}</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${getHealthStatusClass(group.status)}`}>
                {formatHealthStatus(group.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {group.checks.map((check) => (
                <div key={check.id} className="rounded-md bg-[#faf9f6] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{check.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{check.message}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${getHealthStatusClass(check.status)}`}>
                      {formatHealthStatus(check.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">Ultima comprobacion: {new Date(report.generatedAt).toLocaleString("es-ES")}</p>
    </section>
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

function SecurityEventItem({ event, profile }: { event: SecurityEventRow; profile?: AdminProfile }) {
  return (
    <article className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${getSeverityClass(event.severity)}`}>
              {event.severity}
            </span>
            <p className="font-semibold">{event.summary}</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {profile?.email || "Usuario no disponible"} - {new Date(event.created_at).toLocaleString("es-ES")}
          </p>
        </div>
        <span className="rounded-full border border-[#d8f3dc] px-2 py-1 text-xs text-slate-600">{event.route || event.event_type}</span>
      </div>
    </article>
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

function getRateLimitSummary(events: AdminRateLimitEvent[]) {
  const grouped = new Map<RateLimitAction, { count: number; users: Set<string> }>();

  for (const event of events) {
    const current = grouped.get(event.action) || { count: 0, users: new Set<string>() };
    current.count += 1;
    current.users.add(event.user_id);
    grouped.set(event.action, current);
  }

  return Array.from(grouped.entries())
    .map(([action, value]) => ({
      action,
      count: value.count,
      uniqueUsers: value.users.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function formatActionLabel(action: RateLimitAction) {
  const labels: Record<RateLimitAction, string> = {
    document_generate: "Generacion de documentos",
    document_improve: "Mejoras con IA",
    assistant_chat: "Chat asistente",
    assistant_generate: "Generar desde chat",
    template_upload: "Subida de plantillas",
    template_process: "Procesamiento de plantillas",
    workspace_invite: "Invitaciones",
    workspace_member_manage: "Gestion de miembros",
  };

  return labels[action];
}

function formatWorkspaceEventLabel(eventType: WorkspaceAuditEventRow["event_type"]) {
  const labels: Record<WorkspaceAuditEventRow["event_type"], string> = {
    document_created: "Documento creado",
    document_deleted: "Documento eliminado",
    documents_cleared: "Documentos limpiados",
    template_uploaded: "Plantilla subida",
    template_processed: "Plantilla procesada",
    template_updated: "Plantilla actualizada",
    template_deleted: "Plantilla eliminada",
    member_invited: "Invitacion enviada",
    member_joined: "Miembro anadido",
    member_role_updated: "Rol actualizado",
    member_permissions_updated: "Permisos actualizados",
    member_removed: "Miembro eliminado",
    invitation_revoked: "Invitacion revocada",
  };

  return labels[eventType];
}

function getSeverityClass(severity: SecurityEventRow["severity"]) {
  if (severity === "high") {
    return "bg-red-50 text-red-700";
  }

  if (severity === "medium") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getHealthStatusClass(status: HealthCheckStatus) {
  if (status === "error") {
    return "bg-red-50 text-red-700";
  }

  if (status === "warning") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function formatHealthStatus(status: HealthCheckStatus) {
  const labels: Record<HealthCheckStatus, string> = {
    ok: "OK",
    warning: "Aviso",
    error: "Error",
  };

  return labels[status];
}

function countHealthStatuses(report: HealthCheckReport) {
  return report.groups.flatMap((group) => group.checks).reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { ok: 0, warning: 0, error: 0 },
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}
