import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`bg-surface-card rounded-lg border border-border p-6 shadow-card hover:shadow-card-hover transition-shadow duration-150 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-small text-text-secondary font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-h1 font-display font-bold text-text-primary mt-1">
            {value}
          </p>
          {trend && (
            <p
              className={`text-small font-medium mt-1 ${
                trend.positive ? "text-status-success" : "text-status-danger"
              }`}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
