import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { eventsQueries, signalsQueries } from "@/lib/queries";
import { queryClient } from "@/lib/providers/query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  Activity03Icon,
  MoneyBag02Icon,
  LinkSquare01Icon,
  ChartLineData01Icon,
  AlertCircleIcon,
  Clock01Icon,
  TradeUpIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { MarketDetailModal } from "./-components/market-detail-modal";
import type { Id } from "backend/convex/_generated/dataModel";

export const Route = createFileRoute("/dashboard/events/$eventId")({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData({
      ...eventsQueries.withMarkets(params.eventId),
      revalidateIfStale: true,
    });
    return {};
  },
  component: EventDetailRoute,
});

function EventDetailRoute() {
  const { eventId } = Route.useParams();
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(
    null
  );

  const {
    data: event,
    isLoading,
    error,
  } = useQuery(eventsQueries.withMarkets(eventId));

  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={32}
            className="text-red-500"
          />
        </div>
        <h2 className="text-xl font-bold mb-2">Event not found</h2>
        <p className="text-muted-foreground mb-6 max-w-md text-center">
          The event you are looking for doesn't exist or has been removed.
        </p>
        <Button
          variant="outline"
          render={
            <Link to="/dashboard/events">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-2" />
              Back to Events
            </Link>
          }
        />
      </div>
    );
  }

  const polymarketUrl = `https://polymarket.com/event/${event.eventSlug}`;
  const activeMarkets = event.markets.filter((m) => m.isActive);
  const analyzedMarkets = event.markets.filter((m) => m.lastAnalyzedAt);

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      <div className="relative w-full h-[350px] overflow-hidden group">
        <div className="absolute inset-0 bg-background">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500/10 via-background to-background opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end pb-10">
          <div className="container mx-auto px-4 md:px-6">
            <Link
              to="/dashboard/events"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 backdrop-blur-sm bg-background/30 px-3 py-1.5 rounded-full w-fit border border-white/10"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                className="mr-2"
              />
              Back to Events
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      event.isActive
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30"
                        : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border-gray-500/30"
                    }
                  >
                    {event.isActive ? "Active Event" : "Closed Event"}
                  </Badge>
                  {analyzedMarkets.length > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    >
                      <HugeiconsIcon
                        icon={Activity03Icon}
                        size={12}
                        className="mr-1.5"
                      />
                      AI Tracked
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {event.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Calendar03Icon} size={16} />
                    <span>
                      Started {formatRelativeTime(event.firstTradeAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Clock01Icon} size={16} />
                    <span>
                      Last activity {formatRelativeTime(event.lastTradeAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  render={
                    <a
                      href={polymarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <HugeiconsIcon
                        icon={LinkSquare01Icon}
                        size={18}
                        className="mr-2"
                      />
                      View on Polymarket
                    </a>
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-white/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <HugeiconsIcon icon={MoneyBag02Icon} size={64} />
                </div>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Volume
                  </p>
                  <div className="text-3xl font-bold text-foreground tabular-nums">
                    {formatVolume(event.totalVolume)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                    <HugeiconsIcon icon={TradeUpIcon} size={12} />
                    <span>High activity</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-white/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <HugeiconsIcon icon={ChartLineData01Icon} size={64} />
                </div>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Trades
                  </p>
                  <div className="text-3xl font-bold text-foreground tabular-nums">
                    {event.tradeCount.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Across {event.markets.length} markets
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/30 border-white/5">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Market Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Active Markets</span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0">
                      {activeMarkets.length}
                    </Badge>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Closed/Resolved</span>
                    <Badge variant="secondary" className="bg-white/5 text-muted-foreground hover:bg-white/10 border-0">
                      {event.markets.length - activeMarkets.length}
                    </Badge>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">Analyzed by AI</span>
                    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-0">
                      {analyzedMarkets.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

             <div className="lg:hidden">
                <SignalsSection markets={event.markets} />
             </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <HugeiconsIcon icon={ChartLineData01Icon} size={20} className="text-amber-500" />
                  Markets
                </h2>
                <Badge variant="outline" className="text-xs">
                  {event.markets.length} Total
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.markets.map((market) => (
                  <MarketCard
                    key={market._id}
                    market={market}
                    onClick={() => setSelectedMarketSlug(market.slug)}
                  />
                ))}
              </div>
            </section>

            <div className="hidden lg:block">
              <SignalsSection markets={event.markets} />
            </div>
          </div>
        </div>
      </div>

      <MarketDetailModal
        slug={selectedMarketSlug}
        open={!!selectedMarketSlug}
        onOpenChange={(open) => !open && setSelectedMarketSlug(null)}
      />
    </div>
  );
}

function MarketCard({
  market,
  onClick,
}: {
  market: any;
  onClick: () => void;
}) {
  const isAnalyzed = !!market.lastAnalyzedAt;
  const isResolved = !!market.outcome;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col p-5 rounded-xl bg-card border border-white/5 hover:border-amber-500/30 hover:bg-accent/5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Badge
          variant="outline"
          className={`${
            market.isActive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-muted/50 text-muted-foreground border-white/5"
          }`}
        >
          {market.isActive ? "Live" : "Closed"}
        </Badge>
        {isAnalyzed && (
          <Badge
            variant="outline"
            className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
          >
            AI Signal
          </Badge>
        )}
      </div>

      <h3 className="font-semibold text-foreground line-clamp-2 leading-snug mb-4 flex-1 group-hover:text-amber-400 transition-colors">
        {market.title}
      </h3>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <HugeiconsIcon icon={Clock01Icon} size={12} />
            {formatRelativeTime(market.lastTradeAt)}
          </span>
        </div>
        
        {isResolved ? (
             <Badge
                variant="outline"
                className={`ml-auto ${
                  market.outcome === "YES"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : market.outcome === "NO"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                Outcome: {market.outcome}
              </Badge>
        ) : (
            <span className="text-xs font-medium text-amber-500 flex items-center group-hover:translate-x-1 transition-transform">
                View Details
                <HugeiconsIcon icon={ArrowLeft01Icon} size={12} className="ml-1 rotate-180" />
            </span>
        )}
      </div>
    </div>
  );
}

function SignalsSection({ markets }: { markets: any[] }) {
  const mostRecentAnalyzedMarket = markets
    .filter((m) => m.lastAnalyzedAt)
    .sort((a, b) => (b.lastAnalyzedAt || 0) - (a.lastAnalyzedAt || 0))[0];

  const { data: signals } = useQuery({
    ...signalsQueries.byMarket(
      (mostRecentAnalyzedMarket?._id as Id<"markets">) ?? null,
      5
    ),
    enabled: !!mostRecentAnalyzedMarket,
  });

  if (!mostRecentAnalyzedMarket) return null;

  return (
    <Card className="bg-card/30 border-white/5">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HugeiconsIcon icon={Activity03Icon} size={18} className="text-cyan-400" />
          Recent AI Signals
          <span className="text-xs font-normal text-muted-foreground ml-2">
             (from {mostRecentAnalyzedMarket.title})
          </span>
        </h3>
        
        {!signals?.length ? (
           <p className="text-sm text-muted-foreground">No recent signals found.</p>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <Link
                key={signal._id}
                to="/dashboard/trades/$signalId"
                params={{ signalId: signal._id }}
                className="block"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-white/5 hover:bg-accent/10 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`${
                        signal.consensusDecision === "YES"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : signal.consensusDecision === "NO"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {signal.consensusDecision}
                    </Badge>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">
                            {signal.consensusPercentage.toFixed(0)}% Consensus
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(signal.signalTimestamp)}
                        </span>
                    </div>
                  </div>
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="text-muted-foreground rotate-180" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <div className="h-[300px] w-full rounded-2xl bg-muted/20 animate-pulse relative overflow-hidden">
        <div className="absolute bottom-0 left-0 p-8 w-full">
            <Skeleton className="h-12 w-2/3 mb-4" />
            <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 container mx-auto">
        <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
        <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
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

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}
