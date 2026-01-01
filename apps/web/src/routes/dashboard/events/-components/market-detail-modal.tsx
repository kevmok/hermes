import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { marketsActions, tradesQueries } from "@/lib/queries";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity03Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  LinkSquare01Icon,
  MoneyBag02Icon,
} from "@hugeicons/core-free-icons";
import { DeepDivePanel } from "../../-components/deep-dive-panel";

interface MarketDetailModalProps {
  slug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketDetailModal({
  slug,
  open,
  onOpenChange,
}: MarketDetailModalProps) {
  // Fetch market data from Polymarket API
  const { data: market, isLoading: marketLoading } = useQuery({
    ...marketsActions.fetchBySlug(slug ?? ""),
    enabled: !!slug,
  });

  // Fetch market from Convex to get marketId for DeepDive
  const { data: convexMarket } = useQuery({
    ...convexQuery(api.markets.getMarketBySlug, { slug: slug ?? "" }),
    enabled: !!slug,
  });

  // Fetch trades for this market
  const { data: trades, isLoading: tradesLoading } = useQuery({
    ...tradesQueries.byMarket(slug ?? "", 10),
    enabled: !!slug,
  });

  const polymarketUrl = slug ? `https://polymarket.com/event/${slug}` : null;

  // Parse outcome prices
  const prices = market?.outcomePrices
    ? parseOutcomePrices(market.outcomePrices)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Market Details</SheetTitle>
          <SheetDescription className="text-muted-foreground line-clamp-2">
            {market?.question ?? slug?.replace(/-/g, " ")}
          </SheetDescription>
        </SheetHeader>

        {marketLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !market ? (
          <div className="text-center py-8 text-muted-foreground">
            Market data not available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Market image */}
            {market.image && (
              <img
                src={market.image}
                alt=""
                className="w-full h-32 object-cover rounded-xl border border-white/[0.08]"
              />
            )}

            {/* Price & Status */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <Badge
                  className={`${
                    market.active && !market.closed
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border-red-500/30"
                  } border`}
                >
                  {market.active && !market.closed ? "ACTIVE" : "CLOSED"}
                </Badge>
                {market.acceptingOrders && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 border">
                    ACCEPTING ORDERS
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <HugeiconsIcon
                      icon={ArrowUp01Icon}
                      size={16}
                      className="text-emerald-400"
                    />
                    <span className="text-[10px] uppercase tracking-widest text-emerald-300/60">
                      Yes
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {prices ? `${(prices.yes * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={16}
                      className="text-red-400"
                    />
                    <span className="text-[10px] uppercase tracking-widest text-red-300/60">
                      No
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-red-400 tabular-nums">
                    {prices ? `${(prices.no * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Volume & Liquidity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <HugeiconsIcon
                    icon={ChartLineData01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    24h Volume
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatVolume(market.volume24hr ?? 0)}
                </span>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <HugeiconsIcon
                    icon={MoneyBag02Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    Liquidity
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatVolume(parseFloat(market.liquidity ?? "0"))}
                </span>
              </div>
            </div>

            {/* Description */}
            {market.description && (
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  Description
                </h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  {market.description}
                </p>
              </div>
            )}

            {/* End Date */}
            {market.endDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} size={16} />
                <span>Ends {formatDate(market.endDate)}</span>
              </div>
            )}

            {/* Recent Trades */}
            {tradesLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : trades && trades.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={Activity03Icon} size={16} />
                  Recent Trades ({trades.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {trades.slice(0, 5).map((trade) => (
                    <TradeRow key={trade._id} trade={trade} />
                  ))}
                </div>
              </div>
            ) : null}

            {convexMarket && (
              <DeepDivePanel
                marketId={convexMarket._id}
                marketTitle={convexMarket.title}
              />
            )}

            {/* Actions */}
            {polymarketUrl && (
              <Button
                variant="outline"
                className="w-full"
                render={
                  <a
                    href={polymarketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HugeiconsIcon
                      icon={LinkSquare01Icon}
                      size={16}
                      className="mr-2"
                    />
                    Trade on Polymarket
                  </a>
                }
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface Trade {
  _id: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  timestamp: number;
  outcome: string;
  outcomeIndex: number;
  isWhale: boolean;
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === "BUY";
  const isYes = trade.outcome === "Yes" || trade.outcomeIndex === 0;
  const isBullish = (isBuy && isYes) || (!isBuy && !isYes);

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-white/[0.04] bg-white/[0.01]">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded ${
          isBullish ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}
      >
        <HugeiconsIcon
          icon={isBullish ? ArrowUp01Icon : ArrowDown01Icon}
          size={12}
          className={isBullish ? "text-emerald-400" : "text-red-400"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs font-medium ${isBullish ? "text-emerald-400" : "text-red-400"}`}
        >
          {isBuy ? "BUY" : "SELL"} {trade.outcome}
        </span>
        <span className="text-[10px] text-muted-foreground ml-2">
          @ {(trade.price * 100).toFixed(0)}%
        </span>
      </div>
      <div className="text-right">
        <span className="text-xs font-bold text-white">
          {formatUSD(trade.size)}
        </span>
        {trade.isWhale && (
          <Badge className="text-[8px] bg-purple-500/10 text-purple-300 border-purple-500/20 border ml-1">
            WHALE
          </Badge>
        )}
      </div>
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || isNaN(volume)) return "$0";
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

function formatUSD(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseOutcomePrices(
  pricesStr: string,
): { yes: number; no: number } | null {
  try {
    const prices = JSON.parse(pricesStr);
    if (Array.isArray(prices) && prices.length >= 2) {
      return { yes: parseFloat(prices[0]), no: parseFloat(prices[1]) };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}
