import type { SupabaseClient } from "@supabase/supabase-js";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export async function checkGenerationRateLimit(
  supabase: SupabaseClient,
  userId: string,
  plan: "free" | "pro" | "empresa",
): Promise<RateLimitResult> {
  const limit = plan === "free" ? 10 : 60;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  const used = count || 0;
  return {
    allowed: used < limit,
    remaining: Math.max(limit - used, 0),
  };
}

export async function recordGenerationEvent(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.from("generation_events").insert({ user_id: userId });

  if (error) {
    throw error;
  }
}
