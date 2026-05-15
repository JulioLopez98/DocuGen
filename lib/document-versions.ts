import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentVersionRow } from "@/lib/supabase-server";

export type DocumentVersionInsert = {
  document_id: string;
  user_id: string;
  version_number: number;
  content: string;
  change_summary: string;
  change_source?: "original" | "manual" | "ai_improvement" | "restored";
  ai_mode?: string | null;
  model_used?: string | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
};

export const documentVersionSelect =
  "id,document_id,user_id,version_number,content,change_source,change_summary,ai_mode,model_used,tokens_input,tokens_output,created_at";

export async function getDocumentVersions(db: SupabaseClient, documentId: string, userId: string) {
  return db
    .from("document_versions")
    .select(documentVersionSelect)
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .returns<DocumentVersionRow[]>();
}

export function getNextVersionNumber(versions: Pick<DocumentVersionRow, "version_number">[]) {
  return versions.reduce((highest, version) => Math.max(highest, version.version_number), 0) + 1;
}

export async function insertDocumentVersions(db: SupabaseClient, versions: DocumentVersionInsert[]) {
  if (versions.length === 0) {
    return { error: null };
  }

  return db.from("document_versions").insert(versions);
}
