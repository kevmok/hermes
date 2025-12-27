import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  ChartLineData01Icon,
  LinkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { MarketCard } from './market-card';
import type { PolymarketEvent } from '../index';

interface DbMarket {
  _id: string;
  polymarketId: string;
  title: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
  lastAnalyzedAt?: number;
}

interface EventCardProps {
  event: PolymarketEvent;
  index: number;
  dbMarkets: Map<string, DbMarket>;
  onMarketSelect?: (slug: string) => void;
}

export function EventCard({
  event,
  index,
  dbMarkets,
  onMarketSelect,
}: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMarkets = event.markets && event.markets.length > 0;
  const marketCount = event.markets?.length ?? 0;

  // Get the main market (first one) prices
  const mainMarket = event.markets?.[0];
  const prices = mainMarket?.outcomePrices
    ? parseOutcomePrices(mainMarket.outcomePrices)
    : null;

  const polymarketUrl = `https://polymarket.com/event/${event.slug}`;

  // Check if we have this in our database
  const hasDbData = event.markets?.some((m) => dbMarkets.has(m.conditionId));

  return (
    <div
      className='group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12]'
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.4s ease-out forwards',
        opacity: 0,
      }}
    >
      {/* Top accent line */}
      <div className='absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 opacity-60' />

      {/* Hover glow */}
      <div className='absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />

      {/* Content */}
      <div className='relative p-5'>
        {/* Header with image */}
        <div className='flex items-start gap-4 mb-4'>
          {event.image && (
            <img
              src={event.image}
              alt=''
              className='w-12 h-12 rounded-lg object-cover border border-white/[0.08]'
            />
          )}
          <div className='flex-1 min-w-0'>
            <h3 className='text-base font-semibold leading-tight line-clamp-2 text-white/90 group-hover:text-white transition-colors'>
              {event.title}
            </h3>
            <div className='flex items-center gap-2 mt-1.5'>
              {event.active && !event.closed ? (
                <Badge className='text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30 border'>
                  ACTIVE
                </Badge>
              ) : (
                <Badge className='text-[9px] bg-red-500/20 text-red-300 border-red-500/30 border'>
                  CLOSED
                </Badge>
              )}
              {hasDbData && (
                <Badge className='text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 border'>
                  TRACKED
                </Badge>
              )}
              <span className='text-[10px] text-muted-foreground'>
                {marketCount} market{marketCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className='flex items-center gap-4 mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]'>
          <div className='flex-1'>
            <span className='text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-0.5'>
              24h Volume
            </span>
            <span className='text-lg font-bold tabular-nums text-white'>
              {formatVolume(event.volume24hr)}
            </span>
          </div>
          <div className='w-px h-8 bg-white/[0.08]' />
          <div className='flex-1'>
            <span className='text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-0.5'>
              Liquidity
            </span>
            <span className='text-lg font-bold tabular-nums text-white'>
              {formatVolume(event.liquidity)}
            </span>
          </div>
          {prices && (
            <>
              <div className='w-px h-8 bg-white/[0.08]' />
              <div className='flex-1'>
                <span className='text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase block mb-0.5'>
                  Yes Price
                </span>
                <span className='text-lg font-bold tabular-nums text-emerald-400'>
                  {(prices.yes * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* End date */}
        {event.endDate && (
          <div className='flex items-center gap-2 text-xs text-muted-foreground mb-4'>
            <HugeiconsIcon icon={Calendar03Icon} size={14} />
            <span>Ends {formatDate(event.endDate)}</span>
          </div>
        )}

        {/* Expand/collapse markets */}
        {hasMarkets && (
          <Button
            variant='ghost'
            size='sm'
            className='w-full justify-between mb-2'
            onClick={() => setExpanded(!expanded)}
          >
            <span className='flex items-center gap-2'>
              <HugeiconsIcon icon={ChartLineData01Icon} size={14} />
              {expanded ? 'Hide' : 'Show'} {marketCount} market
              {marketCount !== 1 ? 's' : ''}
            </span>
            <HugeiconsIcon
              icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
              size={14}
              className='transition-transform'
            />
          </Button>
        )}

        {/* Expanded markets list */}
        {expanded && hasMarkets && (
          <div className='space-y-2 mb-4 pt-2 border-t border-white/[0.06]'>
            {event.markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                dbMarket={dbMarkets.get(market.conditionId)}
                onSelect={() => onMarketSelect?.(market.slug)}
              />
            ))}
          </div>
        )}

        {/* Action button */}
        <Button
          variant='outline'
          size='sm'
          className='w-full bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all group/btn'
          render={
            <a href={polymarketUrl} target='_blank' rel='noopener noreferrer'>
              <span className='flex items-center justify-center gap-2'>
                <span>View on Polymarket</span>
                <HugeiconsIcon
                  icon={LinkSquare01Icon}
                  size={14}
                  className='text-muted-foreground group-hover/btn:text-amber-400 transition-colors'
                />
              </span>
            </a>
          }
        />
      </div>
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || isNaN(volume)) return '$0';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Ended';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
