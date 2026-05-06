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
  const isPaid = normalized !== "free";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isPaid ? "bg-[#2d6a4f] text-white" : "bg-[#d8f3dc] text-[#1f2933]"
      }`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}
