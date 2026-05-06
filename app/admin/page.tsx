import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase-server";

export default async function AdminPage() {
  const { profile } = await getCurrentProfile();

  if (!profile) {
    redirect("/auth");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <section className="container-page py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2d6a4f]">Admin</p>
      <h1 className="font-serif-display mt-3 text-4xl font-bold">Panel de administración</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {["MRR", "Documentos generados", "Usuarios activos", "Tipos populares"].map((metric) => (
          <div key={metric} className="rounded-md border border-[#d8f3dc] bg-white p-5">
            <p className="text-sm text-slate-500">{metric}</p>
            <p className="mt-3 font-serif-display text-3xl font-bold text-[#2d6a4f]">--</p>
          </div>
        ))}
      </div>
    </section>
  );
}
