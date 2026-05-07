import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <header className="border-b border-[#d8f3dc] bg-[#faf9f6]/95">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-serif-display text-2xl font-bold text-[#2d6a4f]">
          DocuGen
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-[#1f2933] md:flex">
          <Link href="/generar">Generar</Link>
          {user && <Link href="/historial">Historial</Link>}
          {user && <Link href="/dashboard">Dashboard</Link>}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-44 truncate text-sm text-slate-600 sm:inline">{user.email}</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="focus-ring rounded-md border border-[#2d6a4f] px-4 py-2 text-sm font-semibold text-[#2d6a4f]"
              >
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/auth"
            className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
