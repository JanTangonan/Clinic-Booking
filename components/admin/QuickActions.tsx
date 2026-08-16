interface QuickAction {
  icon: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {actions.map((action, idx) => {
        const isPrimary = action.variant !== "secondary";
        return (
          <a
            key={idx}
            href={action.href}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition ${
              isPrimary
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
            }`}
          >
            <span>{action.icon}</span>
            {action.label}
          </a>
        );
      })}
    </div>
  );
}
