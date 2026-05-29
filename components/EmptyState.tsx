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
  steps?: string[];
};

export function EmptyState({
  eyebrow = "Sin datos",
  title,
  description,
  variant = "surface",
  primaryAction,
  secondaryAction,
  children,
  steps,
}: EmptyStateProps) {
  return (
    <section className={`${variant === "surface" ? "surface" : "surface-flat"} p-8`} aria-label={title}>
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="panel-title mt-3">{title}</h2>
        <p className="body-muted mt-3">{description}</p>
      </div>

      {children && <div className="mt-6">{children}</div>}

      {steps && steps.length > 0 && (
        <ol className="mt-6 grid gap-2">
          {steps.map((step, index) => (
            <li key={step} className="interactive-subtle rounded-md border border-[#d8f3dc] bg-white/70 px-3 py-2 text-sm leading-6 text-slate-600">
              <span className="mr-2 font-bold text-[#2d6a4f]">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      )}

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
    </section>
  );
}
