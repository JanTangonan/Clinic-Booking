import Link from "next/link";

interface AlertBannerProps {
  type: "warning" | "error" | "info" | "success";
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function AlertBanner({ type, title, description, action }: AlertBannerProps) {
  const typeStyles = {
    warning: "bg-amber-50 border-amber-300 text-amber-900",
    error: "bg-red-50 border-red-300 text-red-900",
    info: "bg-blue-50 border-blue-300 text-blue-900",
    success: "bg-emerald-50 border-emerald-300 text-emerald-900",
  };

  const iconMap = {
    warning: "⚠️",
    error: "❌",
    info: "ℹ️",
    success: "✅",
  };

  return (
    <div className={`rounded-lg border p-4 ${typeStyles[type]}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{iconMap[type]}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && <p className="text-sm mt-1 opacity-90">{description}</p>}
        </div>
        {action && (
          <Link href={action.href} className="ml-2 px-3 py-1 text-sm font-medium hover:underline flex-shrink-0">
            {action.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
