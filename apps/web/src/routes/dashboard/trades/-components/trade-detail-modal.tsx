import { useQuery } from "@tanstack/react-query";
import { tradesQueries } from "@/lib/queries";
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
  ArrowUp01Icon,
  ArrowDown01Icon,
  UserIcon,
  Clock01Icon,
  LinkSquare01Icon,
  ChartLineData01Icon,
} from "@hugeicons/core-free-icons";

interface TradeDetailModalProps {
  slug: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailModal({
  slug,
  open,
  onOpenChange,
}: TradeDetailModalProps) {
  // Fetch trades for this market slug
  const { data: trades, isLoading: tradesLoading } = useQuery({
    ...tradesQueries.byMarket(slug ?? "", 20),
    enabled: !!slug,
  });

  // Get the first trade to extract market info
  const firstTrade = trades?.[0];

  const polymarketUrl = slug
    ? `https://polymarket.com/event/${firstTrade?.eventSlug ?? slug}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Trade Details</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {slug?.replace(/-/g, " ").slice(0, 60)}
          </SheetDescription>
        </SheetHeader>

        {tradesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !trades?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            No trade data available
          </div>
        ) : (
          <div className="space-y-6">
            {/* Market Summary */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Market Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 block mb-1">
                    Total Trades
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {trades.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 block mb-1">
                    Total Volume
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {formatUSD(
                      trades.reduce((sum, t) => sum + (t.size || 0), 0),
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <HugeiconsIcon icon={ChartLineData01Icon} size={16} />
                Recent Trades
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trades.slice(0, 10).map((trade) => (
                  <TradeRow key={trade._id} trade={trade} />
                ))}
              </div>
            </div>

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

interface Trade {
  _id: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  timestamp: number;
  proxyWallet: string;
  outcome: string;
  outcomeIndex: number;
  isWhale: boolean;
  traderPseudonym?: string;
  marketId?: string;
  eventSlug?: string;
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === "BUY";
  const isYes = trade.outcome === "Yes" || trade.outcomeIndex === 0;
  const isBullish = (isBuy && isYes) || (!isBuy && !isYes);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          isBullish
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-red-500/10 border-red-500/30"
        } border`}
      >
        <HugeiconsIcon
          icon={isBullish ? ArrowUp01Icon : ArrowDown01Icon}
          size={16}
          className={isBullish ? "text-emerald-400" : "text-red-400"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${isBullish ? "text-emerald-400" : "text-red-400"}`}
          >
            {isBuy ? "BUY" : "SELL"} {trade.outcome}
          </span>
          {trade.isWhale && (
            <Badge className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30 border">
              WHALE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <HugeiconsIcon icon={UserIcon} size={10} />
          {trade.traderPseudonym || shortenAddress(trade.proxyWallet)}
          <span className="text-muted-foreground/30">|</span>
          <HugeiconsIcon icon={Clock01Icon} size={10} />
          {formatTimeAgo(trade.timestamp * 1000)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-white">
          {formatUSD(trade.size)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          @ {(trade.price * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatUSD(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
