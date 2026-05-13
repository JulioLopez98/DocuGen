import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingChooser } from "@/components/OnboardingChooser";
import { getCurrentProfile } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Primer documento",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OnboardingPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!supabase || !user || !profile) {
    redirect("/auth");
  }

  const { count } = await supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id);

  if ((count || 0) > 0) {
    redirect("/dashboard");
  }

  const isFree = profile.plan === "free";

  return (
    <section className="container-page py-10">
      <div className="surface overflow-hidden rounded-md">
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="eyebrow">Primer documento</p>
            <h1 className="font-serif-display mt-3 text-5xl font-bold leading-tight">Vamos a crear tu primer borrador</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Elige un documento habitual, completa los campos y revisa el resultado. DocuGen guardara el borrador en tu
              historial para que puedas descargarlo o reutilizarlo despues.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/catalogo" className="focus-ring btn-primary px-5 py-3 text-sm">
                Explorar catalogo
              </Link>
              <Link href="/dashboard" className="focus-ring btn-secondary px-5 py-3 text-sm">
                Saltar por ahora
              </Link>
            </div>
          </div>

          <aside className="rounded-md border border-[#d8f3dc] bg-white/78 p-5">
            <p className="text-sm font-bold text-[#2d6a4f]">Tu plan actual</p>
            <p className="mt-2 font-serif-display text-3xl font-bold capitalize">{profile.plan}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isFree
                ? "Free incluye 3 documentos al mes y los tipos esenciales para probar el flujo."
                : "Tu plan permite documentos ilimitados y acceso a tipos Pro."}
            </p>
          </aside>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Elige un tipo", "Empieza con un documento habitual o busca dentro del catalogo completo."],
          ["2", "Rellena campos", "Usa datos reales o deja informacion pendiente para completarla despues."],
          ["3", "Exporta y reutiliza", "Descarga PDF/TXT, Word si eres Pro, o usa el historial como plantilla."],
        ].map(([step, title, text]) => (
          <article key={step} className="surface-flat rounded-md p-5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2d6a4f] text-sm font-bold text-white">
              {step}
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-6">
        <OnboardingChooser plan={profile.plan} />
      </section>
    </section>
  );
}
