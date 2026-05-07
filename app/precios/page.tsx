import Link from "next/link";
import { PricingCards } from "@/components/PricingCards";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { createSupabaseServerClient, type Profile } from "@/lib/supabase-server";

export default async function PricingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } =
    supabase && user ? await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>() : { data: null };

  return (
    <section className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="eyebrow">Precios</p>
          <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight">Planes claros para trabajar mejor</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Empieza gratis, valida el flujo y activa Pro cuando necesites documentos ilimitados, exportación Word y
            personalización de marca.
          </p>
        </div>
        <Link href={user ? "/dashboard" : "/auth"} className="focus-ring btn-secondary px-4 py-2 text-sm">
          {user ? "Volver al dashboard" : "Empezar gratis"}
        </Link>
      </div>

      <PricingCards compact currentPlan={profile?.plan} />

      <div className="mt-8">
        <LegalDisclaimer />
      </div>
    </section>
  );
}
