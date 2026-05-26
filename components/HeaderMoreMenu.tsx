"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type HeaderMoreLink = {
  href: string;
  label: string;
  description: string;
  badge?: string;
};

export function HeaderMoreMenu({ links }: { links: HeaderMoreLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = "header-more-menu";
  const isActive = links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`nav-link rounded-full px-3 py-2 text-sm font-semibold ${isActive || open ? "nav-link-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        Más
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Más opciones de navegación"
          className="absolute right-0 top-11 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-[#d8f3dc] bg-white shadow-[0_22px_55px_rgba(31,41,51,0.16)]"
        >
          <div className="grid p-2">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-3 transition hover:bg-[#d8f3dc]/45 ${active ? "bg-[#d8f3dc]/55" : ""}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[#1f2933]">{link.label}</span>
                    {link.badge && (
                      <span className="rounded-full bg-[#faf9f6] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2d6a4f]">
                        {link.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{link.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
