type PlanBadgeProps = {
  plan?: string | null;
};

const labels: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  empresa: "Empresa",
};

export function PlanBadge({ plan = "free" }: PlanBadgeProps) {
  const normalized = plan || "free";
  const badgeClass =
    normalized === "empresa" ? "badge badge-empresa" : normalized === "pro" ? "badge badge-pro" : "badge badge-free";

  return (
    <span className={badgeClass}>
      {labels[normalized] || normalized}
    </span>
  );
}
