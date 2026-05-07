import { redirect } from "next/navigation";
import { BrandSettingsForm } from "@/components/BrandSettingsForm";
import { getCurrentProfile, type BrandSettings } from "@/lib/supabase-server";

export default async function SettingsPage() {
  const { supabase, user, profile } = await getCurrentProfile();

  if (!supabase || !user || !profile) {
    redirect("/auth");
  }

  const { data: brandSettings } = await supabase
    .from("brand_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<BrandSettings>();

  return (
    <section className="container-page py-10">
      <div className="mb-8 max-w-3xl">
        <p className="eyebrow">Ajustes</p>
        <h1 className="font-serif-display mt-3 text-4xl font-bold">Cuenta y marca</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gestiona los datos de marca que acompañarán a tus documentos profesionales.
        </p>
      </div>
      <BrandSettingsForm initialSettings={brandSettings || null} userId={user.id} isPro={profile.plan !== "free"} />
    </section>
  );
}
