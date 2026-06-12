type BadgeVariant =
  | "delivered"
  | "opened"
  | "read"
  | "clicked"
  | "failed"
  | "pending"
  | "ai-draft"
  | "high-value"
  | "mid-tier"
  | "low-value"
  | "active"
  | "at-risk"
  | "dormant"
  | "new"
  | "sending"
  | "sent"
  | "draft";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  delivered: "bg-status-success-bg text-status-success",
  opened: "bg-status-opened-bg text-status-opened",
  read: "bg-purple-100 text-purple-700",
  clicked: "bg-status-clicked-bg text-status-clicked",
  failed: "bg-status-danger-bg text-status-danger",
  pending: "bg-status-warning-bg text-status-warning",
  "ai-draft": "bg-brand-coral-light text-brand-coral-text",
  "high-value": "bg-status-success-bg text-status-success",
  "mid-tier": "bg-status-opened-bg text-status-opened",
  "low-value": "bg-status-warning-bg text-status-warning",
  active: "bg-status-success-bg text-status-success",
  "at-risk": "bg-status-warning-bg text-status-warning",
  dormant: "bg-status-danger-bg text-status-danger",
  new: "bg-status-opened-bg text-status-opened",
  sending: "bg-status-warning-bg text-status-warning",
  sent: "bg-status-success-bg text-status-success",
  draft: "bg-surface-panel text-text-secondary",
};

export default function StatusBadge({
  variant,
  children,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-[11px] font-medium leading-tight whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
