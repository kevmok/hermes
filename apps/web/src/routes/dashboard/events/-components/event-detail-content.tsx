import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  Activity03Icon,
  MoneyBag02Icon,
  LinkSquare01Icon,
  ChartLineData01Icon,
} from '@hugeicons/core-free-icons';
import { signalsQueries } from '@/lib/queries';
import type { Id } from 'backend/convex/_generated/dataModel';

// Market type from backend
interface Market {
  _id: string;
  polymarketId: string;
  slug: string;
  eventSlug: string;
  title: string;
  imageUrl?: string;
  isActive: boolean;
  lastTradeAt: number;
  lastAnalyzedAt?: number;
  outcome?: 'YES' | 'NO' | 'INVALID' | null;
  resolvedAt?: number;
}

// Event with markets type
interface EventWithMarkets {
  _id: string;
  _creationTime: number;
  eventSlug: string;
  title: string;
  imageUrl?: string;
  isActive: boolean;
  firstTradeAt: number;
  lastTradeAt: number;
  tradeCount: number;
  totalVolume: number;
  markets: Market[];
}

interface EventDetailContentProps {
  event: EventWithMarkets;
}

export function EventDetailContent({ event }: EventDetailContentProps) {
  const polymarketUrl = `https://polymarket.com/event/${event.eventSlug}`;
  const analyzedMarkets = event.markets.filter(m => m.lastAnalyzedAt);

  return (
    <div className="flex flex-col h-full">
      {/* Header with accent line */}
      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-600" />

      <SheetHeader className="p-6 pb-4">
        <div className="flex items-start gap-4">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="w-16 h-16 rounded-xl object-cover bg-white/5 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-lg leading-tight mb-2">
              {event.title}
            </SheetTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${
                  event.isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                } border`}
              >
                {event.isActive ? 'Active' : 'Closed'}
              </Badge>
              <Badge variant="outline" className="bg-white/5 border-white/10">
                {event.markets.length} markets
              </Badge>
              {analyzedMarkets.length > 0 && (
                <Badge
                  variant="outline"
                  className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                >
                  <HugeiconsIcon icon={Activity03Icon} size={12} className="mr-1" />
                  {analyzedMarkets.length} analyzed
                </Badge>
              )}
            </div>
          </div>
        </div>
        <SheetDescription className="text-xs text-muted-foreground mt-2">
          First trade {formatRelativeTime(event.firstTradeAt)} · Last activity{' '}
          {formatRelativeTime(event.lastTradeAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        {/* Stats Section */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Overview
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon icon={ChartLineData01Icon} size={14} />
                <span className="text-xs">Trades</span>
              </div>
              <span className="text-lg font-bold tabular-nums">
                {event.tradeCount.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon icon={MoneyBag02Icon} size={14} />
                <span className="text-xs">Volume</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-emerald-400">
                {formatVolume(event.totalVolume)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <HugeiconsIcon icon={Calendar03Icon} size={14} />
                <span className="text-xs">Markets</span>
              </div>
              <span className="text-lg font-bold tabular-nums">
                {event.markets.length}
              </span>
            </div>
          </div>
        </section>

        <Separator className="bg-white/[0.06]" />

        {/* Markets Section */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Markets ({event.markets.length})
          </h3>
          <div className="space-y-2">
            {event.markets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No markets tracked yet.</p>
            ) : (
              event.markets.map((market) => (
                <MarketRow key={market._id} market={market} />
              ))
            )}
          </div>
        </section>

        <Separator className="bg-white/[0.06]" />

        {/* Recent Signals Section */}
        <RecentSignals markets={event.markets} />

        <Separator className="bg-white/[0.06]" />

        {/* Related Links */}
        <section>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Related
          </h3>
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors"
          >
            <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="text-amber-400" />
            <span className="text-sm">View on Polymarket</span>
          </a>
        </section>
      </div>
    </div>
  );
}

interface MarketRowProps {
  market: Market;
}

function MarketRow({ market }: MarketRowProps) {
  const isAnalyzed = !!market.lastAnalyzedAt;
  const isResolved = !!market.outcome;

  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{market.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(market.lastTradeAt)}
            </span>
            {isAnalyzed && (
              <Badge
                variant="outline"
                className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] py-0"
              >
                Analyzed
              </Badge>
            )}
            {isResolved && (
              <Badge
                variant="outline"
                className={`text-[10px] py-0 ${
                  market.outcome === 'YES'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : market.outcome === 'NO'
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {market.outcome}
              </Badge>
            )}
          </div>
        </div>
        <Badge
          variant={market.isActive ? 'default' : 'secondary'}
          className={market.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border' : ''}
        >
          {market.isActive ? 'Active' : 'Closed'}
        </Badge>
      </div>
    </div>
  );
}

interface RecentSignalsProps {
  markets: Market[];
}

function RecentSignals({ markets }: RecentSignalsProps) {
  // Get the first market with analysis to show signals
  const analyzedMarket = markets.find(m => m.lastAnalyzedAt);

  const { data: signals } = useQuery({
    ...signalsQueries.byMarket(analyzedMarket?._id as Id<'markets'> ?? null, 5),
    enabled: !!analyzedMarket,
  });

  return (
    <section>
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
        Recent Signals
      </h3>
      {!analyzedMarket ? (
        <p className="text-sm text-muted-foreground">
          No AI signals generated for this event's markets yet.
        </p>
      ) : !signals?.length ? (
        <p className="text-sm text-muted-foreground">No signals found.</p>
      ) : (
        <div className="space-y-2">
          {signals.slice(0, 5).map((signal) => (
            <Link
              key={signal._id}
              to="/dashboard/trades/$signalId"
              params={{ signalId: signal._id }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    signal.consensusDecision === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : signal.consensusDecision === 'NO'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {signal.consensusDecision}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {signal.consensusPercentage.toFixed(0)}% consensus
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(signal.signalTimestamp)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}
