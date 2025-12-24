import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/insights/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.insights.getLatestInsights, { limit: 20 })
    );
  },
  component: InsightsPage,
});

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function InsightsPage() {
  const { data: insights, isLoading } = useQuery(
    convexQuery(api.insights.getLatestInsights, { limit: 20 })
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-muted-foreground">
          AI-powered analysis and consensus recommendations from multiple models.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-sidebar-border bg-sidebar/50">
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights?.length === 0 ? (
        <Card className="border-sidebar-border bg-sidebar/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HugeiconsIcon
              icon={SparklesIcon}
              size={48}
              className="text-muted-foreground mb-4"
            />
            <p className="text-muted-foreground text-center">
              No insights available yet.
              <br />
              AI analysis will appear here once markets are analyzed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {insights?.map((insight) => (
            <InsightCard key={insight._id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}

interface InsightCardProps {
  insight: {
    _id: string;
    consensusDecision: "YES" | "NO" | "NO_TRADE";
    consensusPercentage: number;
    confidenceLevel: "high" | "medium" | "low";
    aggregatedReasoning: string;
    timestamp: number;
    market: {
      title: string;
      currentYesPrice: number;
    } | null;
  };
}

function InsightCard({ insight }: InsightCardProps) {
  const decisionConfig = {
    YES: {
      icon: ArrowUp01Icon,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    NO: {
      icon: ArrowDown01Icon,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    NO_TRADE: {
      icon: MinusSignIcon,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    },
  };

  const config = decisionConfig[insight.consensusDecision];

  const confidenceBadgeVariant = {
    high: "default" as const,
    medium: "secondary" as const,
    low: "outline" as const,
  };

  return (
    <Card
      className={`border-sidebar-border bg-sidebar/50 overflow-hidden transition-colors hover:bg-sidebar/70`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium leading-tight line-clamp-2">
            {insight.market?.title ?? "Unknown Market"}
          </CardTitle>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bgColor} ${config.borderColor} border`}
          >
            <HugeiconsIcon icon={config.icon} size={20} className={config.color} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant={confidenceBadgeVariant[insight.confidenceLevel]}
            className="text-xs"
          >
            {insight.confidenceLevel} confidence
          </Badge>
          <span className="text-xs text-muted-foreground">
            {insight.consensusPercentage}% consensus
          </span>
          <span className="text-xs text-muted-foreground">
            • {formatTimeAgo(insight.timestamp)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Decision:</span>
            <span className={`font-semibold ${config.color}`}>
              {insight.consensusDecision.replace("_", " ")}
            </span>
          </div>
          {insight.market && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current:</span>
              <span className="font-medium">
                {(insight.market.currentYesPrice * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {insight.aggregatedReasoning}
        </p>
      </CardContent>
    </Card>
  );
}
