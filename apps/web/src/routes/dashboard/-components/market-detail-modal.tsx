import { useQuery } from "@tanstack/react-query";
import { convexQuery, convexAction } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import type { Id } from "backend/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LinkSquare01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { DeepDivePanel } from "./deep-dive-panel";

interface MarketDetailModalProps {
  marketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  NO: {
    icon: ArrowDown01Icon,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
};

export function MarketDetailModal({
  marketId,
  open,
  onOpenChange,
}: MarketDetailModalProps) {
  // Fetch static market data from DB
  const { data: market, isLoading: marketLoading } = useQuery({
    ...convexQuery(api.markets.getMarket, {
      marketId: marketId as Id<"markets">,
    }),
    enabled: !!marketId && open,
  });

  // Fetch real-time prices from Polymarket API
  const { data: liveMarket, isLoading: liveLoading } = useQuery({
    ...convexAction(api.polymarket.markets.getMarketBySlug, {
      slug: market?.slug ?? "",
    }),
    enabled: !!market?.slug && open,
  });

  const { data: signals, isLoading: signalsLoading } = useQuery({
    ...convexQuery(api.signals.getSignalsByMarket, {
      marketId: marketId as Id<"markets">,
      limit: 5,
    }),
    enabled: !!marketId && open,
  });

  const isLoading = marketLoading || signalsLoading;

  const polymarketUrl = market?.eventSlug
    ? `https://polymarket.com/event/${market.eventSlug}`
    : null;

  // Parse real-time prices from API response
  const yesPrice = liveMarket?.outcomePrices
    ? parseFloat(liveMarket.outcomePrices[0] ?? "0")
    : null;
  const noPrice = liveMarket?.outcomePrices
    ? parseFloat(liveMarket.outcomePrices[1] ?? "0")
    : null;
  const volume24h = liveMarket?.volume24hr
    ? parseFloat(liveMarket.volume24hr)
    : null;
  const totalVolume = liveMarket?.volumeNum ?? null;

  if (!marketId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !market ? (
          <div className="space-y-4 py-8">
            <div className="h-6 w-3/4 bg-white/6 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/4 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-white/4 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-xl leading-tight pr-4">
                    {market.title}
                  </DialogTitle>
                  <DialogDescription className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {market.eventSlug}
                    </Badge>
                  </DialogDescription>
                </div>
                <Badge
                  variant={market.isActive ? "default" : "secondary"}
                  className={
                    market.isActive
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-white/5 text-white/50 border-white/10"
                  }
                >
                  {market.isActive ? "Active" : "Closed"}
                </Badge>
              </div>
            </DialogHeader>

            {/* Price & Volume Stats - fetched from Polymarket API */}
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="p-4 rounded-lg bg-white/2 border border-white/6">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-1">
                  YES Price
                </span>
                {liveLoading ? (
                  <div className="h-8 w-16 bg-white/6 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-emerald-400">
                    {yesPrice !== null
                      ? `${(yesPrice * 100).toFixed(0)}%`
                      : "—"}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-white/2 border border-white/6">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-1">
                  NO Price
                </span>
                {liveLoading ? (
                  <div className="h-8 w-16 bg-white/6 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-red-400">
                    {noPrice !== null ? `${(noPrice * 100).toFixed(0)}%` : "—"}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-white/2 border border-white/6">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-1">
                  24h Volume
                </span>
                {liveLoading ? (
                  <div className="h-7 w-20 bg-white/6 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-semibold tabular-nums">
                    {volume24h !== null
                      ? `$${volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </p>
                )}
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-1">
                  Total Volume
                </span>
                {liveLoading ? (
                  <div className="h-7 w-20 bg-white/6 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-semibold tabular-nums">
                    {totalVolume !== null
                      ? `$${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Outcome (if resolved) */}
            {market.outcome && (
              <>
                <div
                  className={`p-4 rounded-lg ${
                    market.outcome === "YES"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : market.outcome === "NO"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                  } border`}
                >
                  <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-1">
                    Market Resolved
                  </span>
                  <p
                    className={`text-lg font-bold ${
                      market.outcome === "YES"
                        ? "text-emerald-400"
                        : market.outcome === "NO"
                          ? "text-red-400"
                          : "text-amber-400"
                    }`}
                  >
                    Outcome: {market.outcome}
                  </p>
                  {market.resolvedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved on{" "}
                      {new Date(market.resolvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Related Signals */}
            {signals && signals.length > 0 && (
              <>
                <div className="py-4">
                  <h3 className="text-sm font-semibold mb-3">
                    AI Signals for this Market
                  </h3>
                  <div className="space-y-2">
                    {signals.map((signal) => {
                      const config = decisionConfig[signal.consensusDecision];
                      return (
                        <div
                          key={signal._id}
                          className={`p-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={config.icon}
                                size={16}
                                className={config.color}
                              />
                              <span className={`font-semibold ${config.color}`}>
                                {signal.consensusDecision.replace("_", " ")}
                              </span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {signal.consensusPercentage.toFixed(0)}%
                                consensus
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                signal.signalTimestamp,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {signal.aggregatedReasoning}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Deep Dive Research */}
            <DeepDivePanel
              marketId={marketId as Id<"markets">}
              marketTitle={market.title}
            />

            <Separator />

            {/* Actions */}
            <DialogFooter className="gap-2 pt-4">
              {polymarketUrl && (
                <Button
                  className="flex-1"
                  render={
                    <a
                      href={polymarketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>Trade on Polymarket</span>
                        <HugeiconsIcon icon={LinkSquare01Icon} size={16} />
                      </span>
                    </a>
                  }
                />
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
