import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  ChartLineData01Icon,
  Dollar01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";

export function StatsBar() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  if (isLoading) {
    return (
      <div className="h-10 border-b border-border bg-muted/30">
        <div className="flex items-center justify-center h-full px-4 gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(0)}%`,
      icon: Award01Icon,
      positive: stats.winRate >= 50,
    },
    {
      label: "Signals",
      value: stats.totalSignals.toLocaleString(),
      icon: ChartLineData01Icon,
      positive: true,
    },
    {
      label: "ROI",
      value: `${stats.simulatedROI >= 0 ? "+" : ""}${stats.simulatedROI.toFixed(1)}%`,
      icon: Dollar01Icon,
      positive: stats.simulatedROI >= 0,
    },
    {
      label: "24h",
      value: stats.signalsLast24h.toString(),
      icon: Clock01Icon,
      positive: true,
      hideOnMobile: true,
    },
  ];

  return (
    <Link
      to="/dashboard/performance"
      className="block border-b border-border bg-muted/20 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-center h-10 px-4 gap-4 sm:gap-8 overflow-x-auto">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`flex items-center gap-2 shrink-0 ${metric.hideOnMobile ? "hidden sm:flex" : ""}`}
          >
            <HugeiconsIcon
              icon={metric.icon}
              size={14}
              className={metric.positive ? "text-primary" : "text-destructive"}
            />
            <span className="text-xs text-muted-foreground">
              {metric.label}
            </span>
            <span
              className={`text-xs font-semibold font-mono-data ${
                metric.positive ? "text-foreground" : "text-destructive"
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}

        {/* Live indicator on right */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>
    </Link>
  );
}
