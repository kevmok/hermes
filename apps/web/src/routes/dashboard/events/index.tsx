import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { eventsActions, marketsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import { EventCard } from './-components/event-card';
import { MarketDetailModal } from './-components/market-detail-modal';
import { DataLoading, DataEmpty, DataError } from '@/components/ui/data-states';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  FilterIcon,
  SortingAZ01Icon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/events/')({
  loader: async () => {
    // Prefetch events and active markets
    await Promise.all([
      queryClient.ensureQueryData({
        ...eventsActions.list({ limit: 20, active: true }),
        revalidateIfStale: true,
      }),
      queryClient.ensureQueryData({
        ...marketsQueries.active({ limit: 50, sortBy: 'volume' }),
        revalidateIfStale: true,
      }),
    ]);
    return {};
  },
  component: EventsPage,
});

type SortOption = 'volume24hr' | 'startDate' | 'endDate' | 'liquidity';
type FilterOption = 'all' | 'active' | 'ending_soon';

function EventsPage() {
  const [sortBy, setSortBy] = useState<SortOption>('volume24hr');
  const [filter, setFilter] = useState<FilterOption>('active');
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(
    null,
  );

  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery(
    eventsActions.list({
      limit: 30,
      active: filter === 'active' || filter === 'ending_soon',
      order: sortBy,
      ascending: false,
    }),
  );

  // Get our database markets for enrichment
  const { data: dbMarkets } = useQuery(
    marketsQueries.active({ limit: 100, sortBy: 'volume' }),
  );

  // Create a map of polymarket IDs to our database markets
  const marketMap = new Map(dbMarkets?.map((m) => [m.polymarketId, m]) ?? []);

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='relative overflow-hidden border-b border-amber-500/10'>
        {/* Animated gradient background */}
        <div className='absolute inset-0 bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-background' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent' />

        {/* Grid pattern */}
        <div
          className='absolute inset-0 opacity-[0.03]'
          style={{
            backgroundImage: `linear-gradient(rgba(245, 158, 11, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.3) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className='relative px-6 py-8'>
          {/* Header */}
          <div className='flex items-start justify-between mb-6'>
            <div className='space-y-2'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-amber-500/20 blur-xl rounded-full' />
                  <div className='relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/10'>
                    <HugeiconsIcon
                      icon={Calendar03Icon}
                      size={24}
                      className='text-amber-400'
                    />
                  </div>
                </div>
                <div>
                  <h1 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent'>
                    Polymarket Events
                  </h1>
                  <p className='text-sm text-amber-300/60 font-mono'>
                    BROWSE & ANALYZE
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground max-w-lg'>
                Explore prediction markets by event. Each event can contain
                multiple related markets.
              </p>
            </div>

            {/* Stats */}
            <div className='flex items-center gap-3'>
              <div className='px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
                <span className='text-[10px] uppercase tracking-widest text-muted-foreground/60 block'>
                  Events
                </span>
                <span className='text-xl font-bold text-white'>
                  {events?.length ?? 0}
                </span>
              </div>
              <div className='px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
                <span className='text-[10px] uppercase tracking-widest text-muted-foreground/60 block'>
                  Markets
                </span>
                <span className='text-xl font-bold text-white'>
                  {(events as PolymarketEvent[] | undefined)?.reduce(
                    (sum, e) => sum + (e.markets?.length ?? 0),
                    0,
                  ) ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Filters & Sort */}
          <div className='flex items-center gap-3 flex-wrap'>
            {/* Filter buttons */}
            <div className='flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
              <HugeiconsIcon
                icon={FilterIcon}
                size={14}
                className='ml-2 text-muted-foreground'
              />
              {(['all', 'active', 'ending_soon'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'ghost'}
                  size='sm'
                  className={
                    filter === f ? 'bg-amber-500/20 text-amber-300' : ''
                  }
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'
                    ? 'All'
                    : f === 'active'
                      ? 'Active'
                      : 'Ending Soon'}
                </Button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className='flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
              <HugeiconsIcon
                icon={SortingAZ01Icon}
                size={14}
                className='ml-2 text-muted-foreground'
              />
              {(['volume24hr', 'liquidity', 'endDate'] as const).map((s) => (
                <Button
                  key={s}
                  variant={sortBy === s ? 'default' : 'ghost'}
                  size='sm'
                  className={
                    sortBy === s ? 'bg-amber-500/20 text-amber-300' : ''
                  }
                  onClick={() => setSortBy(s)}
                >
                  {s === 'volume24hr'
                    ? 'Volume'
                    : s === 'liquidity'
                      ? 'Liquidity'
                      : 'End Date'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='p-6'>
        {isLoading ? (
          <DataLoading count={6} variant='grid' />
        ) : error ? (
          <DataError
            message='Failed to load events from Polymarket'
            onRetry={() => refetch()}
          />
        ) : !events?.length ? (
          <DataEmpty
            title='No events found'
            description='Try adjusting your filters or check back later.'
            icon={Calendar03Icon}
          />
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {(events as PolymarketEvent[]).map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                dbMarkets={marketMap}
                onMarketSelect={setSelectedMarketSlug}
              />
            ))}
          </div>
        )}
      </div>

      {/* Market Detail Modal */}
      <MarketDetailModal
        slug={selectedMarketSlug}
        open={!!selectedMarketSlug}
        onOpenChange={(open) => !open && setSelectedMarketSlug(null)}
      />
    </div>
  );
}

// Types for Polymarket API response
interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string;
  volume: string;
  volume24hr: number;
  liquidity: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
}

interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  volume: number;
  volume24hr: number;
  liquidity: number;
  markets: PolymarketMarket[];
}

export type { PolymarketEvent, PolymarketMarket };
