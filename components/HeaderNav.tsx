"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderNavProps = {
  links: {
    href: string;
    label: string;
  }[];
  className?: string;
};

export function HeaderNav({ links, className = "" }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`items-center gap-2 text-sm font-semibold ${className}`}>
      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link key={link.href} className={`nav-link rounded-full px-3 py-2 ${isActive ? "nav-link-active" : ""}`} href={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
