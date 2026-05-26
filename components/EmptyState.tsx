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
    <div className={`${variant === "surface" ? "surface" : "surface-flat"} rounded-md p-8`}>
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="font-serif-display mt-3 text-3xl font-bold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      {children && <div className="mt-6">{children}</div>}

      {steps && steps.length > 0 && (
        <div className="mt-6 grid gap-2">
          {steps.map((step, index) => (
            <p key={step} className="rounded-md border border-[#d8f3dc] bg-white/70 px-3 py-2 text-sm leading-6 text-slate-600">
              <span className="mr-2 font-bold text-[#2d6a4f]">{index + 1}.</span>
              {step}
            </p>
          ))}
        </div>
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
    </div>
  );
}
