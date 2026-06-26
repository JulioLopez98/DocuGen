import Link from "next/link";
import { HeaderMoreMenu, type HeaderMoreLink } from "@/components/HeaderMoreMenu";
import { HeaderNav } from "@/components/HeaderNav";
import { createSupabaseServerClient, type Profile } from "@/lib/supabase-server";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } =
    supabase && user
      ? await supabase.from("profiles").select("plan,role").eq("id", user.id).maybeSingle<Pick<Profile, "plan" | "role">>()
      : { data: null };
  const plan = profile?.plan || "free";
  const role = profile?.role || "user";
  const isPaid = plan === "pro" || plan === "empresa";
  const isEmpresa = plan === "empresa";

  const links = user
    ? [
        { href: "/dashboard", label: "Panel" },
        { href: "/generar", label: "Crear" },
        { href: "/historial", label: "Documentos" },
        ...(isPaid ? [{ href: "/plantillas", label: "Plantillas" }] : []),
        ...(isEmpresa ? [{ href: "/workspace", label: "Equipo" }] : []),
      ]
    : [
        { href: "/catalogo", label: "Tipos de documento" },
        { href: "/precios", label: "Precios" },
      ];
  const moreLinks = user ? buildUserMoreLinks({ isPaid, isEmpresa, role }) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-[#d8f3dc]/80 bg-[#fffdf8]/90 shadow-[0_6px_24px_rgba(31,41,51,0.04)] backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif-display text-2xl font-bold tracking-tight text-[#2d6a4f]">
          DocuGen
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <HeaderNav links={links} className="flex" />
          {moreLinks.length > 0 && <HeaderMoreMenu links={moreLinks} />}
        </div>

        {user ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className={`hidden xl:inline ${plan === "empresa" ? "badge badge-empresa" : plan === "pro" ? "badge badge-pro" : "badge badge-free"}`}>
              {plan}
            </span>
            <span className="hidden max-w-44 truncate text-sm text-slate-600 xl:inline">{user.email}</span>
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
      <div className="border-t border-[#d8f3dc]/70 lg:hidden">
        <div className="container-page overflow-x-auto py-2">
          <div className="flex min-w-max items-center gap-2">
            <HeaderNav links={links} className="flex" />
            {moreLinks.length > 0 && <HeaderMoreMenu links={moreLinks} />}
          </div>
        </div>
      </div>
    </header>
  );
}

function buildUserMoreLinks({
  isPaid,
  isEmpresa,
  role,
}: {
  isPaid: boolean;
  isEmpresa: boolean;
  role: Profile["role"];
}): HeaderMoreLink[] {
  return [
    {
      href: "/asistente",
      label: "Asistente",
      description: "Pide documentos a medida con una conversación guiada.",
      badge: isPaid ? undefined : "Pro",
    },
    {
      href: "/catalogo",
      label: "Tipos de documento",
      description: "Explora el catálogo completo por categorías.",
    },
    ...(!isPaid
      ? [
          {
            href: "/plantillas",
            label: "Plantillas",
            description: "Usa documentos propios como referencia de estilo.",
            badge: "Pro",
          },
        ]
      : []),
    ...(!isEmpresa
      ? [
          {
            href: "/workspace",
            label: "Equipo",
            description: "Comparte documentos, plantillas y permisos con tu equipo.",
            badge: "Empresa",
          },
        ]
      : []),
    {
      href: "/precios",
      label: "Precios",
      description: "Compara Free, Pro y Empresa.",
    },
    {
      href: "/ajustes",
      label: "Ajustes",
      description: "Marca, cuenta, preferencias y suscripción.",
    },
    ...(role === "admin"
      ? [
          {
            href: "/admin",
            label: "Admin",
            description: "Operaciones, seguridad, catálogo comunitario y métricas.",
            badge: "Admin",
          },
        ]
      : []),
  ];
}
