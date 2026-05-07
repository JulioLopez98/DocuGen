import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const links = user
    ? [
        { href: "/", label: "Inicio" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/generar", label: "Generar" },
        { href: "/historial", label: "Historial" },
        { href: "/precios", label: "Precios" },
        { href: "/ajustes", label: "Ajustes" },
      ]
    : [
        { href: "/", label: "Inicio" },
        { href: "/generar", label: "Generador" },
        { href: "/precios", label: "Precios" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8f3dc]/80 bg-[#faf9f6]/86 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif-display text-2xl font-bold tracking-tight text-[#2d6a4f]">
          DocuGen
        </Link>

        <HeaderNav links={links} className="hidden md:flex" />

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-44 truncate text-sm text-slate-600 lg:inline">{user.email}</span>
            <form action="/auth/logout" method="post">
              <button type="submit" className="focus-ring btn-secondary px-4 py-2 text-sm">
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link href="/auth" className="focus-ring btn-primary px-4 py-2 text-sm">
            Entrar
          </Link>
        )}
      </div>
      <div className="border-t border-[#d8f3dc]/70 md:hidden">
        <div className="container-page overflow-x-auto py-2">
          <HeaderNav links={links} className="flex min-w-max" />
        </div>
      </div>
    </header>
  );
}
