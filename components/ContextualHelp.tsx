import Link from "next/link";

type ContextualHelpAction = {
  href: string;
  label: string;
};

type ContextualHelpProps = {
  eyebrow?: string;
  title: string;
  description: string;
  items?: string[];
  primaryAction?: ContextualHelpAction;
  secondaryAction?: ContextualHelpAction;
  tone?: "default" | "pro" | "empresa";
};

export function ContextualHelp({
  eyebrow = "Ayuda rápida",
  title,
  description,
  items = [],
  primaryAction,
  secondaryAction,
  tone = "default",
}: ContextualHelpProps) {
  return (
    <aside className={`rounded-md border p-5 shadow-[0_10px_28px_rgba(31,41,51,0.04)] ${getToneClassName(tone)}`} aria-label={title}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-serif-display text-2xl font-bold">{title}</h2>
      <p className="body-muted mt-2">{description}</p>
      {items.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {items.map((item) => (
            <li key={item} className="interactive-subtle rounded-md border border-[#d8f3dc]/70 bg-white/72 px-3 py-2 text-xs leading-5 text-slate-600">
              {item}
            </li>
          ))}
        </ul>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {primaryAction && (
            <Link href={primaryAction.href} className="focus-ring btn-primary px-4 py-2 text-sm">
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="focus-ring btn-secondary px-4 py-2 text-sm">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}

function getToneClassName(tone: ContextualHelpProps["tone"]) {
  if (tone === "pro") {
    return "border-[#2d6a4f] bg-[#f4fbf5]";
  }

  if (tone === "empresa") {
    return "border-[#d8f3dc] bg-white";
  }

  return "border-[#d8f3dc] bg-[#faf9f6]";
}
