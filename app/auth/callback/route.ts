import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWelcomeEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/onboarding";
  const response = NextResponse.redirect(new URL(next, request.url));

  if (!code || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const errorUrl = new URL("/auth", request.url);
    errorUrl.searchParams.set("error", "missing_auth_code");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("auth_callback_error", error);
    const errorUrl = new URL("/auth", request.url);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle<{ created_at: string }>(),
      ]);
      const profileAgeMs = profile?.created_at ? Date.now() - new Date(profile.created_at).getTime() : Number.POSITIVE_INFINITY;
      const isRecentSignup = !profile?.created_at || profileAgeMs < 15 * 60 * 1000;

      if ((count || 0) === 0 && isRecentSignup) {
        await sendWelcomeEmail({
          to: user.email,
          name: user.user_metadata?.full_name || user.email.split("@")[0],
        });
      }
    }
  } catch (emailError) {
    console.error("welcome_email_error", emailError);
  }

  return response;
}
