import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { signalsQueries } from "@/lib/queries";
import { queryClient } from "@/lib/providers/query";
import type { Id } from "backend/convex/_generated/dataModel";
import { ConsensusViz } from "./-components/consensus-viz";
import { ModelReasoningCards } from "./-components/model-reasoning-cards";
import { MarketMetadata } from "./-components/market-metadata";
import { DeepDivePanel } from "../../-components/deep-dive-panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/trades/$signalId/")({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData({
      ...signalsQueries.withPredictions(params.signalId as Id<"signals">),
      revalidateIfStale: true,
    });
    return {};
  },
  component: TradeDetailPage,
});

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    label: "BUY YES",
  },
  NO: {
    icon: ArrowDown01Icon,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "BUY NO",
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "NO TRADE",
  },
};

function TradeDetailPage() {
  const { signalId } = Route.useParams();

  const {
    data: signal,
    isLoading,
    error,
  } = useQuery(signalsQueries.withPredictions(signalId as Id<"signals">));

  if (isLoading) {
    return <TradeDetailSkeleton />;
  }

  if (error || !signal) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground mb-4">Signal not found</p>
        <Link
          to="/dashboard/trades"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Trades
        </Link>
      </div>
    );
  }

  const config = decisionConfig[signal.consensusDecision];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Compact with CTA */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-muted/50 to-background">
        <div className="relative px-4 md:px-6 py-6">
          {/* Back Button */}
          <Link
            to="/dashboard/trades"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mb-4 -ml-2",
            )}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-2" />
            Back to Signals
          </Link>

          {/* Title Row with CTA */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl border shrink-0",
                  config.bgColor,
                  config.borderColor,
                )}
              >
                <HugeiconsIcon
                  icon={config.icon}
                  size={24}
                  className={config.color}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold mb-2 leading-tight">
                  {signal.market?.title ?? "Unknown Market"}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "border text-sm",
                      config.bgColor,
                      config.color,
                      config.borderColor,
                    )}
                  >
                    {config.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      signal.confidenceLevel === "high"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : signal.confidenceLevel === "medium"
                          ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30"
                          : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {signal.confidenceLevel} confidence
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {signal.consensusPercentage.toFixed(0)}% consensus
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(signal.signalTimestamp)}
                  </span>
                </div>
              </div>
            </div>

            {signal.market?.eventSlug && (
              <a
                href={`https://polymarket.com/event/${signal.market.eventSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "shrink-0 gap-2 bg-primary hover:bg-primary/90",
                )}
              >
                <HugeiconsIcon icon={LinkSquare01Icon} size={18} />
                Trade on Polymarket
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Quick Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Consensus Card */}
            <section>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Model Consensus
              </h2>
              <ConsensusViz
                decision={signal.consensusDecision}
                percentage={signal.consensusPercentage}
                agreeingModels={signal.agreeingModels}
                totalModels={signal.totalModels}
                predictions={signal.predictions || []}
                voteDistribution={signal.voteDistribution}
              />
            </section>

            {/* Market Details */}
            <section>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Market Details
              </h2>
              <MarketMetadata
                priceAtTrigger={signal.priceAtTrigger}
                signalTimestamp={signal.signalTimestamp}
                triggerTrade={signal.triggerTrade}
                outcome={signal.market?.outcome}
                resolvedAt={signal.market?.resolvedAt}
                consensusDecision={signal.consensusDecision}
              />
            </section>

            {/* Key Factors & Risks - Compact */}
            {(signal.aggregatedKeyFactors?.length ||
              signal.aggregatedRisks?.length) && (
              <section className="space-y-4">
                {signal.aggregatedKeyFactors &&
                  signal.aggregatedKeyFactors.length > 0 && (
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-semibold mb-2 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Key Factors
                        </h3>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {signal.aggregatedKeyFactors.map((factor, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                •
                              </span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                {signal.aggregatedRisks &&
                  signal.aggregatedRisks.length > 0 && (
                    <Card className="border-border">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-semibold mb-2 text-red-600 dark:text-red-400 uppercase tracking-wider">
                          Risks
                        </h3>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {signal.aggregatedRisks.map((risk, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-red-600 dark:text-red-400">
                                •
                              </span>
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
              </section>
            )}
          </div>

          {/* Right Column - Analysis */}
          <div className="lg:col-span-3 space-y-6">
            {/* AI Analysis */}
            {signal.predictions && signal.predictions.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  AI Analysis
                </h2>
                <ModelReasoningCards predictions={signal.predictions} />
              </section>
            )}

            {/* Aggregated Reasoning */}
            <section>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Aggregated Reasoning
              </h2>
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {signal.aggregatedReasoning}
                  </p>
                </CardContent>
              </Card>
            </section>

            {signal.market && (
              <section>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Deep Research
                </h2>
                <DeepDivePanel
                  marketId={signal.market._id}
                  marketTitle={signal.market.title}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="px-6 py-8 border-b border-white/5">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-8 w-96 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-8">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
