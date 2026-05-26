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
  eyebrow = "Ayuda rapida",
  title,
  description,
  items = [],
  primaryAction,
  secondaryAction,
  tone = "default",
}: ContextualHelpProps) {
  return (
    <aside className={`rounded-md border p-5 ${getToneClassName(tone)}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2d6a4f]">{eyebrow}</p>
      <h2 className="mt-2 font-serif-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {items.length > 0 && (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <p key={item} className="rounded-md bg-white/72 px-3 py-2 text-xs leading-5 text-slate-600">
              {item}
            </p>
          ))}
        </div>
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
