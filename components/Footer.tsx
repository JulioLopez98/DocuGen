import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#d8f3dc] bg-white/55">
      <div className="container-page grid gap-6 py-10 text-sm text-slate-600 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-serif-display text-xl font-bold text-[#2d6a4f]">DocuGen</p>
          <p className="mt-2 max-w-2xl">
            Borradores profesionales generados con IA para ahorrar tiempo. No sustituye asesoramiento legal,
            laboral, fiscal ni profesional.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/catalogo">Catalogo</Link>
          <Link href="/plantillas">Plantillas</Link>
          <Link href="/precios">Precios</Link>
          <Link href="/generar">Generador</Link>
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/politica-privacidad">Privacidad</Link>
          <Link href="/auth">Acceso</Link>
        </div>
      </div>
    </footer>
  );
}
