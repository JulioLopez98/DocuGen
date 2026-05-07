import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AuthPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) {
    redirect("/dashboard");
  }

  return (
    <section className="container-page py-16">
      <Suspense>
        <AuthForm />
      </Suspense>
    </section>
  );
}
