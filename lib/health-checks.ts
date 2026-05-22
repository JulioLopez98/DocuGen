import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MODEL, PREMIUM_MODEL } from "@/lib/openai";
import { stripePriceIds } from "@/lib/stripe";

export type HealthCheckStatus = "ok" | "warning" | "error";

export type HealthCheckItem = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  message: string;
  detail?: string;
};

export type HealthCheckGroup = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  checks: HealthCheckItem[];
};

export type HealthCheckReport = {
  status: HealthCheckStatus;
  generatedAt: string;
  groups: HealthCheckGroup[];
};

export async function runInternalHealthChecks(supabase: SupabaseClient): Promise<HealthCheckReport> {
  const groups: HealthCheckGroup[] = [
    await checkAppConfig(),
    await checkSupabase(supabase),
    checkOpenAI(),
    checkStripe(),
    checkResend(),
  ];

  return {
    status: mergeStatuses(groups.map((group) => group.status)),
    generatedAt: new Date().toISOString(),
    groups,
  };
}

async function checkAppConfig(): Promise<HealthCheckGroup> {
  const checks: HealthCheckItem[] = [
    envCheck("NEXT_PUBLIC_APP_URL", "URL publica de la app", "Necesaria para redirects, emails y enlaces."),
  ];

  return group("app", "Aplicacion", checks);
}

async function checkSupabase(supabase: SupabaseClient): Promise<HealthCheckGroup> {
  const checks: HealthCheckItem[] = [
    envCheck("NEXT_PUBLIC_SUPABASE_URL", "Supabase URL", "Necesaria para cliente browser y servidor."),
    envCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase anon key", "Necesaria para auth y RLS desde cliente."),
    envCheck("SUPABASE_SERVICE_ROLE_KEY", "Supabase service role", "Necesaria para rutas server admin y webhooks."),
  ];

  checks.push(await tableCheck(supabase, "profiles", "Tabla profiles"));
  checks.push(await tableCheck(supabase, "documents", "Tabla documents"));
  checks.push(await tableCheck(supabase, "rate_limit_events", "Tabla rate_limit_events"));
  checks.push(await tableCheck(supabase, "security_events", "Tabla security_events"));
  checks.push(await tableCheck(supabase, "operational_alerts", "Tabla operational_alerts"));
  checks.push(await tableCheck(supabase, "api_error_events", "Tabla api_error_events"));

  return group("supabase", "Supabase", checks);
}

function checkOpenAI(): HealthCheckGroup {
  const checks: HealthCheckItem[] = [
    envCheck("OPENAI_API_KEY", "OpenAI API key", "Necesaria para generar documentos."),
    valueCheck("OPENAI_MODEL_DEFAULT", DEFAULT_MODEL, "Modelo por defecto", "Modelo usado para Free."),
    valueCheck("OPENAI_MODEL_PREMIUM", PREMIUM_MODEL, "Modelo premium", "Modelo usado para Pro y Empresa."),
  ];

  return group("openai", "OpenAI", checks);
}

function checkStripe(): HealthCheckGroup {
  const checks: HealthCheckItem[] = [
    envCheck("STRIPE_SECRET_KEY", "Stripe secret key", "Necesaria para Checkout y Portal."),
    envCheck("STRIPE_WEBHOOK_SECRET", "Stripe webhook secret", "Necesaria para verificar webhooks."),
    valueCheck("STRIPE_PRICE_ID_PRO", stripePriceIds.pro, "Stripe price Pro", "Necesaria para vender Pro."),
    valueCheck("STRIPE_PRICE_ID_EMPRESA", stripePriceIds.empresa, "Stripe price Empresa", "Necesaria para vender Empresa.", "warning"),
  ];

  return group("stripe", "Stripe", checks);
}

function checkResend(): HealthCheckGroup {
  const checks: HealthCheckItem[] = [
    envCheck("RESEND_API_KEY", "Resend API key", "Necesaria para emails transaccionales.", "warning"),
    valueCheck(
      "RESEND_FROM_EMAIL",
      process.env.RESEND_FROM_EMAIL || "",
      "Email remitente",
      "Recomendado para produccion; si falta se usa onboarding@resend.dev.",
      "warning",
    ),
  ];

  return group("resend", "Resend", checks);
}

function envCheck(
  envName: string,
  label: string,
  detail: string,
  missingStatus: HealthCheckStatus = "error",
): HealthCheckItem {
  return valueCheck(envName, process.env[envName] || "", label, detail, missingStatus);
}

function valueCheck(
  id: string,
  value: string,
  label: string,
  detail: string,
  missingStatus: HealthCheckStatus = "error",
): HealthCheckItem {
  const hasValue = Boolean(value?.trim());

  return {
    id,
    label,
    status: hasValue ? "ok" : missingStatus,
    message: hasValue ? "Configurado" : "Pendiente de configurar",
    detail,
  };
}

async function tableCheck(supabase: SupabaseClient, table: string, label: string): Promise<HealthCheckItem> {
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true }).limit(1);

  if (error) {
    return {
      id: `table:${table}`,
      label,
      status: "error",
      message: "No accesible",
      detail: error.message,
    };
  }

  return {
    id: `table:${table}`,
    label,
    status: "ok",
    message: "Accesible",
  };
}

function group(id: string, label: string, checks: HealthCheckItem[]): HealthCheckGroup {
  return {
    id,
    label,
    checks,
    status: mergeStatuses(checks.map((check) => check.status)),
  };
}

function mergeStatuses(statuses: HealthCheckStatus[]): HealthCheckStatus {
  if (statuses.includes("error")) {
    return "error";
  }

  if (statuses.includes("warning")) {
    return "warning";
  }

  return "ok";
}
