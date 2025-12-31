import { useQuery } from "@tanstack/react-query";
import { eventsQueries, eventsActions, tradesQueries } from "@/lib/queries";
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
  ArrowRight01Icon,
  ArrowUp01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  LinkSquare01Icon,
  MoneyBag02Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";

interface EventDetailModalProps {
  eventSlug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarketSelect?: (slug: string) => void;
}

export function EventDetailModal({
  eventSlug,
  open,
  onOpenChange,
  onMarketSelect,
}: EventDetailModalProps) {
  // Fetch event from our database with markets
  const { data: eventWithMarkets, isLoading: eventLoading } = useQuery({
    ...eventsQueries.withMarkets(eventSlug ?? ""),
    enabled: !!eventSlug,
  });

  // Fetch real-time data from Polymarket API
  const { data: apiEvent, isLoading: apiLoading } = useQuery({
    ...eventsActions.fetchBySlug(eventSlug ?? ""),
    enabled: !!eventSlug,
  });

  // Fetch recent trades for this event
  const { data: recentTrades } = useQuery({
    ...tradesQueries.byEvent(eventSlug ?? "", 10),
    enabled: !!eventSlug,
  });

  // Event properties are spread directly onto eventWithMarkets, not nested under .event
  const event = eventWithMarkets;
  const markets = eventWithMarkets?.markets ?? [];
  const polymarketUrl = eventSlug
    ? `https://polymarket.com/event/${eventSlug}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Event Details</SheetTitle>
          <SheetDescription className="text-muted-foreground line-clamp-2">
            {event?.title ?? eventSlug?.replace(/-/g, " ")}
          </SheetDescription>
        </SheetHeader>

        {eventLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !event ? (
          <div className="text-center py-8 text-muted-foreground">
            Event data not available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event image */}
            {(event.imageUrl || apiEvent?.image) && (
              <img
                src={event.imageUrl || apiEvent?.image}
                alt=""
                className="w-full h-32 object-cover rounded-xl border border-white/[0.08]"
              />
            )}

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {event.isActive ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border">
                  ACTIVE
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 border">
                  CLOSED
                </Badge>
              )}
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 border">
                TRACKED
              </Badge>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <HugeiconsIcon
                    icon={ChartLineData01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    Whale Trades
                  </span>
                </div>
                <span className="text-xl font-bold text-white">
                  {event.tradeCount}
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
                    Total Volume
                  </span>
                </div>
                <span className="text-xl font-bold text-emerald-400">
                  {formatVolume(event.totalVolume)}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Time01Icon} size={14} />
                <span>First trade {formatTimeAgo(event.firstTradeAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Clock01Icon} size={14} />
                <span>Last trade {formatTimeAgo(event.lastTradeAt)}</span>
              </div>
            </div>

            {/* Markets Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={Activity03Icon} size={16} />
                Markets ({markets.length})
              </h3>

              {apiLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : markets.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {markets.map((market) => {
                    // Find matching API market for real-time prices
                    const apiMarket = apiEvent?.markets?.find(
                      (m: { conditionId?: string; id?: string }) =>
                        m.conditionId === market.polymarketId ||
                        m.conditionId === market.conditionId ||
                        m.id === market.polymarketId,
                    );
                    const prices = apiMarket?.outcomePrices
                      ? parseOutcomePrices(apiMarket.outcomePrices)
                      : null;

                    return (
                      <MarketRow
                        key={market._id}
                        market={market}
                        prices={prices}
                        hasSignal={!!market.lastAnalyzedAt}
                        onSelect={() => onMarketSelect?.(market.slug)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No markets tracked yet
                </div>
              )}
            </div>

            {/* Recent Trades */}
            {recentTrades && recentTrades.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={ChartLineData01Icon} size={16} />
                  Recent Trades ({recentTrades.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentTrades.slice(0, 5).map((trade) => (
                    <TradeRow key={trade._id} trade={trade} />
                  ))}
                </div>
              </div>
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
                    View on Polymarket
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

interface Market {
  _id: string;
  polymarketId: string;
  slug: string;
  title: string;
  isActive: boolean;
  lastAnalyzedAt?: number;
}

interface MarketRowProps {
  market: Market;
  prices: { yes: number; no: number } | null;
  hasSignal: boolean;
  onSelect?: () => void;
}

function MarketRow({ market, prices, hasSignal, onSelect }: MarketRowProps) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group/market"
    >
      {/* Price indicator */}
      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/[0.02] border border-white/[0.06]">
        <span className="text-lg font-bold text-emerald-400 tabular-nums">
          {prices ? `${(prices.yes * 100).toFixed(0)}%` : "—"}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase">YES</span>
      </div>

      {/* Market info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white/90 line-clamp-2 group-hover/market:text-white transition-colors">
          {market.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {market.isActive ? (
            <Badge className="text-[8px] bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20 border px-1.5 py-0">
              ACTIVE
            </Badge>
          ) : (
            <Badge className="text-[8px] bg-red-500/10 text-red-300/80 border-red-500/20 border px-1.5 py-0">
              CLOSED
            </Badge>
          )}
          {hasSignal && (
            <Badge className="text-[8px] bg-cyan-500/10 text-cyan-300/80 border-cyan-500/20 border px-1.5 py-0 flex items-center gap-0.5">
              <HugeiconsIcon icon={Activity03Icon} size={8} />
              SIGNALS
            </Badge>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={16}
        className="text-muted-foreground/40 group-hover/market:text-white/60 transition-colors"
      />
    </div>
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

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
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
