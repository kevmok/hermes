import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Activity03Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import type { PolymarketMarket } from '../index';

interface DbMarket {
  _id: string;
  polymarketId: string;
  title: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
  lastAnalyzedAt?: number;
}

interface MarketCardProps {
  market: PolymarketMarket;
  dbMarket?: DbMarket;
  onSelect?: () => void;
}

export function MarketCard({ market, dbMarket, onSelect }: MarketCardProps) {
  const prices = market.outcomePrices
    ? parseOutcomePrices(market.outcomePrices)
    : null;

  // Use DB price if available (more up-to-date), otherwise API price
  const yesPrice = dbMarket?.currentYesPrice ?? prices?.yes ?? 0;
  const hasSignals = !!dbMarket?.lastAnalyzedAt;

  return (
    <div
      onClick={onSelect}
      className='flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group/market'
    >
      {/* Price indicator */}
      <div className='flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
        <span className='text-lg font-bold text-emerald-400 tabular-nums'>
          {(yesPrice * 100).toFixed(0)}%
        </span>
        <span className='text-[9px] text-muted-foreground uppercase'>YES</span>
      </div>

      {/* Market info */}
      <div className='flex-1 min-w-0'>
        <h4 className='text-sm font-medium text-white/90 line-clamp-2 group-hover/market:text-white transition-colors'>
          {market.question}
        </h4>
        <div className='flex items-center gap-2 mt-1'>
          {market.active && !market.closed ? (
            <Badge className='text-[8px] bg-emerald-500/10 text-emerald-300/80 border-emerald-500/20 border px-1.5 py-0'>
              ACTIVE
            </Badge>
          ) : (
            <Badge className='text-[8px] bg-red-500/10 text-red-300/80 border-red-500/20 border px-1.5 py-0'>
              CLOSED
            </Badge>
          )}
          {hasSignals && (
            <Badge className='text-[8px] bg-cyan-500/10 text-cyan-300/80 border-cyan-500/20 border px-1.5 py-0 flex items-center gap-0.5'>
              <HugeiconsIcon icon={Activity03Icon} size={8} />
              SIGNALS
            </Badge>
          )}
          <span className='text-[10px] text-muted-foreground/60'>
            {formatVolume(market.volume24hr)} 24h vol
          </span>
        </div>
      </div>

      {/* Arrow indicator */}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={16}
        className='text-muted-foreground/40 group-hover/market:text-white/60 transition-colors'
      />
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || isNaN(volume)) return '$0';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
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
