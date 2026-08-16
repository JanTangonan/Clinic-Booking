interface KpiCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: {
    percentage: number;
    direction: "up" | "down";
  };
  status?: "success" | "warning" | "danger" | "neutral";
}

export function KpiCard({ icon, label, value, trend, status = "neutral" }: KpiCardProps) {
  const statusColors = {
    success: "bg-emerald-50 border-emerald-200",
    warning: "bg-amber-50 border-amber-200",
    danger: "bg-red-50 border-red-200",
    neutral: "bg-slate-50 border-slate-200",
  };

  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
  };

  return (
    <div className={`rounded-lg border p-5 ${statusColors[status]} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trendColors[trend.direction]}`}>
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.percentage)}% from yesterday
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
