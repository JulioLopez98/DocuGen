import Link from "next/link";
import type { ReactNode } from "react";

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
        <div className="flex flex-wrap gap-2">
          <FooterLink href="/catalogo">Tipos de documento</FooterLink>
          <FooterLink href="/plantillas">Plantillas</FooterLink>
          <FooterLink href="/precios">Precios</FooterLink>
          <FooterLink href="/generar">Generador</FooterLink>
          <FooterLink href="/aviso-legal">Aviso legal</FooterLink>
          <FooterLink href="/politica-privacidad">Privacidad</FooterLink>
          <FooterLink href="/auth">Acceso</FooterLink>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring rounded-md px-2 py-2 transition hover:text-[#2d6a4f]">
      {children}
    </Link>
  );
}
