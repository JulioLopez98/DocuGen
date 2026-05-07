import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8f3dc]/80 bg-[#faf9f6]/86 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif-display text-2xl font-bold tracking-tight text-[#2d6a4f]">
          DocuGen
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          <Link className="nav-link" href="/generar">
            Generar
          </Link>
          <Link className="nav-link" href="/#precios">
            Precios
          </Link>
          {user && (
            <Link className="nav-link" href="/historial">
              Historial
            </Link>
          )}
          {user && (
            <Link className="nav-link" href="/dashboard">
              Dashboard
            </Link>
          )}
        </nav>

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
    </header>
  );
}
