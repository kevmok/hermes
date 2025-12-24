import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChartLineData01Icon,
  SparklesIcon,
  Dollar01Icon,
} from "@hugeicons/core-free-icons";

interface StatsCardsProps {
  totalMarkets: number;
  highConfidenceInsights: number;
  totalVolume24h: number;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function StatsCards({
  totalMarkets,
  highConfidenceInsights,
  totalVolume24h,
  isLoading = false,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Active Markets",
      value: totalMarkets.toLocaleString(),
      icon: ChartLineData01Icon,
      description: "Markets being tracked",
      iconColor: "text-cyan-400",
      bgGradient: "from-cyan-500/10 to-cyan-500/5",
    },
    {
      title: "High Confidence",
      value: highConfidenceInsights.toLocaleString(),
      icon: SparklesIcon,
      description: "AI-powered insights",
      iconColor: "text-emerald-400",
      bgGradient: "from-emerald-500/10 to-emerald-500/5",
    },
    {
      title: "24h Volume",
      value: formatVolume(totalVolume24h),
      icon: Dollar01Icon,
      description: "Trading activity",
      iconColor: "text-purple-400",
      bgGradient: "from-purple-500/10 to-purple-500/5",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-sidebar-border bg-sidebar/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="border-sidebar-border bg-sidebar/50 overflow-hidden relative"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} pointer-events-none`}
          />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg bg-background/50 ${stat.iconColor}`}
            >
              <HugeiconsIcon icon={stat.icon} size={18} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
