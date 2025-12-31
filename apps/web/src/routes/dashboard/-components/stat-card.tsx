import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconSvgElement;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
  isLoading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    icon: "text-primary",
    iconBg: "bg-primary/10",
    accent: "bg-primary",
  },
  success: {
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-500/10",
    accent: "bg-green-500",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    accent: "bg-amber-500",
  },
  danger: {
    icon: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-500/10",
    accent: "bg-red-500",
  },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
  isLoading = false,
  className = "",
}: StatCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg border border-border bg-card p-4 ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-16 mb-1" />
        <Skeleton className="h-3 w-12" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-card p-4 hover-lift ${className}`}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${styles.accent} opacity-60`}
      />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <HugeiconsIcon icon={icon} size={16} className={styles.icon} />
        </div>
      </div>

      <div className="font-mono-data text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>

      {trend && (
        <div
          className={`text-xs mt-1 ${trend.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {trend.positive ? "↑" : "↓"} {trend.value}
        </div>
      )}
    </div>
  );
}
