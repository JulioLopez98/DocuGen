import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  variant?: "surface" | "flat";
  primaryAction?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
  children?: ReactNode;
};

export function EmptyState({
  eyebrow = "Sin datos",
  title,
  description,
  variant = "surface",
  primaryAction,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className={`${variant === "surface" ? "surface" : "surface-flat"} rounded-md p-8`}>
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="font-serif-display mt-3 text-3xl font-bold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {children && <div className="mt-6">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryAction && (
            <Link href={primaryAction.href} className="focus-ring btn-primary px-5 py-3 text-sm">
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="focus-ring btn-secondary px-5 py-3 text-sm">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
