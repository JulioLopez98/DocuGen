import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { TemplateUsageMode } from "@/lib/template-usage";

export type Profile = {
  id: string;
  email: string | null;
  plan: "free" | "pro" | "empresa";
  role: "user" | "admin";
  docs_this_month: number;
  stripe_customer_id: string | null;
  referral_code: string | null;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  doc_type: string;
  doc_label: string;
  content: string;
  form_data: Record<string, string>;
  reference_template_id: string | null;
  reference_template_name: string | null;
  template_usage_mode: TemplateUsageMode | null;
  model_used: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
};

export type BrandSettings = {
  id: string;
  user_id: string;
  company_name: string | null;
  cif: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentTemplateStatus = "uploaded" | "processing" | "ready" | "failed";

export type DocumentTemplateRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  original_filename: string;
  file_type: "pdf" | "docx" | "doc";
  mime_type: string | null;
  file_size: number | null;
  storage_bucket: string;
  storage_path: string;
  status: DocumentTemplateStatus;
  extracted_text: string | null;
  extracted_metadata: Record<string, unknown>;
  summary: string | null;
  notes: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRequestStatus = "submitted" | "reviewing" | "approved" | "rejected" | "converted";

export type DocumentRequestTone =
  | "formal"
  | "comercial"
  | "laboral_prudente"
  | "legal_prudente"
  | "email"
  | "carta"
  | "natural";

export type DocumentRequestRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  intended_use: string | null;
  tone: DocumentRequestTone;
  sector: string | null;
  generated_document_id: string | null;
  status: DocumentRequestStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityDocumentTypeStatus = "draft" | "reviewing" | "approved" | "published" | "rejected";

export type CommunityDocumentTypeRow = {
  id: string;
  source_request_id: string | null;
  created_by: string | null;
  slug: string;
  label: string;
  description: string;
  category: string | null;
  status: CommunityDocumentTypeStatus;
  required_plan: "free" | "pro" | "empresa";
  prompt_brief: string;
  suggested_fields: Array<{ name: string; label: string; type: "text" | "textarea" | "date" | "email" }>;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export function hasSupabaseServerEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createSupabaseServerClient() {
  if (!hasSupabaseServerEnv()) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components cannot always write cookies; middleware and route handlers refresh sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Server Components cannot always write cookies; middleware and route handlers refresh sessions.
          }
        },
      },
    },
  );
}

export function createSupabaseServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireUser() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return { supabase: null, user: null, error: "Supabase no está configurado." };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: "Sesión no válida." };
  }

  return { supabase, user, error: null };
}

export async function getCurrentProfile() {
  const { supabase, user } = await requireUser();

  if (!supabase || !user) {
    return { supabase, user, profile: null };
  }

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();

  return { supabase, user, profile: data };
}
