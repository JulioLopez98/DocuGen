import type { SupabaseClient } from "@supabase/supabase-js";
import { recordSecurityEvent } from "@/lib/security-events";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export type RateLimitAction =
  | "document_generate"
  | "document_improve"
  | "assistant_chat"
  | "assistant_generate"
  | "template_upload"
  | "template_process"
  | "workspace_invite"
  | "workspace_member_manage";

type ActionRateLimitOptions = {
  supabase: SupabaseClient;
  userId: string;
  action: RateLimitAction;
  userLimit: number;
  workspaceId?: string | null;
  workspaceLimit?: number;
  windowSeconds?: number;
  route?: string;
};

type ActionRateLimitResult = RateLimitResult & {
  scope: "user" | "workspace" | null;
  retryAfterSeconds: number;
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

export async function checkActionRateLimit({
  supabase,
  userId,
  action,
  userLimit,
  workspaceId,
  workspaceLimit,
  windowSeconds = 60 * 60,
  route,
}: ActionRateLimitOptions): Promise<ActionRateLimitResult> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const userCount = await countRateLimitEvents(supabase, {
    userId,
    action,
    since,
  });

  if (userCount === null) {
    return allowFallback(userLimit, windowSeconds);
  }

  if (userCount >= userLimit) {
    await recordRateLimitBlockedEvent(supabase, {
      userId,
      workspaceId,
      action,
      route,
      scope: "user",
      limit: userLimit,
      windowSeconds,
    });

    return {
      allowed: false,
      remaining: 0,
      scope: "user",
      retryAfterSeconds: windowSeconds,
    };
  }

  if (workspaceId && workspaceLimit) {
    const workspaceCount = await countRateLimitEvents(supabase, {
      workspaceId,
      action,
      since,
    });

    if (workspaceCount === null) {
      return allowFallback(userLimit - userCount, windowSeconds);
    }

    if (workspaceCount >= workspaceLimit) {
      await recordRateLimitBlockedEvent(supabase, {
        userId,
        workspaceId,
        action,
        route,
        scope: "workspace",
        limit: workspaceLimit,
        windowSeconds,
      });

      return {
        allowed: false,
        remaining: 0,
        scope: "workspace",
        retryAfterSeconds: windowSeconds,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(Math.min(userLimit - userCount, workspaceLimit - workspaceCount), 0),
      scope: null,
      retryAfterSeconds: windowSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(userLimit - userCount, 0),
    scope: null,
    retryAfterSeconds: windowSeconds,
  };
}

export async function recordActionRateLimitEvent(
  supabase: SupabaseClient,
  {
    userId,
    action,
    workspaceId = null,
  }: {
    userId: string;
    action: RateLimitAction;
    workspaceId?: string | null;
  },
) {
  const { error } = await supabase.from("rate_limit_events").insert({
    user_id: userId,
    workspace_id: workspaceId,
    action,
  });

  if (error) {
    console.error("rate_limit_event_record_error", error);
  }
}

async function countRateLimitEvents(
  supabase: SupabaseClient,
  filters: {
    userId?: string;
    workspaceId?: string;
    action: RateLimitAction;
    since: string;
  },
) {
  let query = supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("action", filters.action)
    .gte("created_at", filters.since);

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.workspaceId) {
    query = query.eq("workspace_id", filters.workspaceId);
  }

  const { count, error } = await query;

  if (error) {
    console.error("rate_limit_event_count_error", error);
    return null;
  }

  return count || 0;
}

function allowFallback(remaining: number, retryAfterSeconds: number): ActionRateLimitResult {
  return {
    allowed: true,
    remaining: Math.max(remaining, 0),
    scope: null,
    retryAfterSeconds,
  };
}

async function recordRateLimitBlockedEvent(
  supabase: SupabaseClient,
  {
    userId,
    workspaceId,
    action,
    route,
    scope,
    limit,
    windowSeconds,
  }: {
    userId: string;
    workspaceId?: string | null;
    action: RateLimitAction;
    route?: string;
    scope: "user" | "workspace";
    limit: number;
    windowSeconds: number;
  },
) {
  await recordSecurityEvent(supabase, {
    userId,
    workspaceId: workspaceId || null,
    eventType: "rate_limit_blocked",
    severity: scope === "workspace" ? "high" : "medium",
    route: route || action,
    summary:
      scope === "workspace"
        ? `Workspace bloqueado por limite de ${action}`
        : `Usuario bloqueado por limite de ${action}`,
    metadata: {
      action,
      scope,
      limit,
      windowSeconds,
    },
  });
}
