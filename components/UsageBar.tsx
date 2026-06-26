type UsageBarProps = {
  used: number;
  limit?: number;
  plan?: string;
};

export function UsageBar({ used, limit = 3, plan = "free" }: UsageBarProps) {
  const unlimited = plan !== "free";
  const percent = unlimited ? 100 : Math.min((used / limit) * 100, 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1f2933]">Uso mensual</span>
        <span className="font-semibold">{unlimited ? `${used} documentos` : `${used}/${limit}`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-[#d8f3dc] bg-[#fffdf8]/82 shadow-inner">
        <div className="h-full rounded-full bg-[#2d6a4f] transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
