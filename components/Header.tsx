import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-[#d8f3dc] bg-[#faf9f6]/95">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-serif-display text-2xl font-bold text-[#2d6a4f]">
          DocuGen
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-[#1f2933] md:flex">
          <Link href="/generar">Generar</Link>
          <Link href="/historial">Historial</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <Link
          href="/auth"
          className="focus-ring rounded-md bg-[#2d6a4f] px-4 py-2 text-sm font-semibold text-white"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
