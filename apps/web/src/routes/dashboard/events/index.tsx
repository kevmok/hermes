import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { eventsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import { TrackedEventCard } from './-components/tracked-event-card';
import { EventDetailModal } from './-components/event-detail-modal';
import { MarketDetailModal } from './-components/market-detail-modal';
import { DataLoading, DataEmpty, DataError } from '@/components/ui/data-states';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  Activity03Icon,
  SortingAZ01Icon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/events/')({
  loader: async () => {
    // Prefetch tracked events with signal counts
    await queryClient.ensureQueryData({
      ...eventsQueries.withSignals(30),
      revalidateIfStale: true,
    });
    return {};
  },
  component: EventsPage,
});

type SortOption = 'recent' | 'volume';

function EventsPage() {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(
    null,
  );
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(
    null,
  );

  // Get tracked events with signal counts
  const {
    data: events,
    isLoading,
    error,
    refetch,
  } = useQuery(eventsQueries.withSignals(50));

  // Get event stats for header
  const { data: stats } = useQuery(eventsQueries.stats());

  // Sort events client-side based on sortBy
  const sortedEvents = events
    ? [...events].sort((a, b) => {
        if (sortBy === 'volume') {
          return b.totalVolume - a.totalVolume;
        }
        return b.lastTradeAt - a.lastTradeAt;
      })
    : [];

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
                    Tracked Events
                  </h1>
                  <p className='text-sm text-amber-300/60 font-mono'>
                    WHALE ACTIVITY DETECTED
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground max-w-lg'>
                Events with whale trades captured from our WebSocket feed.
                Click to see markets and AI signals.
              </p>
            </div>

            {/* Stats */}
            <div className='flex items-center gap-3'>
              <div className='px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
                <span className='text-[10px] uppercase tracking-widest text-muted-foreground/60 block'>
                  Events
                </span>
                <span className='text-xl font-bold text-white'>
                  {stats?.totalEvents ?? events?.length ?? 0}
                </span>
              </div>
              <div className='px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
                <span className='text-[10px] uppercase tracking-widest text-muted-foreground/60 block'>
                  Trades
                </span>
                <span className='text-xl font-bold text-white'>
                  {stats?.totalTrades ?? 0}
                </span>
              </div>
              <div className='px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                <span className='text-[10px] uppercase tracking-widest text-emerald-300/60 block'>
                  Volume
                </span>
                <span className='text-xl font-bold text-emerald-400'>
                  {formatVolume(stats?.totalVolume ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Sort options */}
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-white/[0.06]'>
              <HugeiconsIcon
                icon={SortingAZ01Icon}
                size={14}
                className='ml-2 text-muted-foreground'
              />
              {(['recent', 'volume'] as const).map((s) => (
                <Button
                  key={s}
                  variant={sortBy === s ? 'default' : 'ghost'}
                  size='sm'
                  className={
                    sortBy === s ? 'bg-amber-500/20 text-amber-300' : ''
                  }
                  onClick={() => setSortBy(s)}
                >
                  {s === 'recent' ? 'Recent' : 'Volume'}
                </Button>
              ))}
            </div>

            {/* Signal indicator */}
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20'>
              <HugeiconsIcon
                icon={Activity03Icon}
                size={14}
                className='text-cyan-400'
              />
              <span className='text-xs text-cyan-300'>
                {events?.filter((e) => e.signalCount > 0).length ?? 0} with
                signals
              </span>
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
            message='Failed to load tracked events'
            onRetry={() => refetch()}
          />
        ) : !sortedEvents.length ? (
          <DataEmpty
            title='No tracked events yet'
            description='Events will appear here when whale trades are captured. Start the WebSocket collector to track live activity.'
            icon={Calendar03Icon}
          />
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {sortedEvents.map((event, index) => (
              <TrackedEventCard
                key={event._id}
                event={event}
                index={index}
                onEventSelect={() => setSelectedEventSlug(event.eventSlug)}
                onMarketSelect={setSelectedMarketSlug}
              />
            ))}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        eventSlug={selectedEventSlug}
        open={!!selectedEventSlug}
        onOpenChange={(open) => !open && setSelectedEventSlug(null)}
        onMarketSelect={(slug) => {
          setSelectedEventSlug(null);
          setSelectedMarketSlug(slug);
        }}
      />

      {/* Market Detail Modal */}
      <MarketDetailModal
        slug={selectedMarketSlug}
        open={!!selectedMarketSlug}
        onOpenChange={(open) => !open && setSelectedMarketSlug(null)}
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

// Export types for tracked events
export interface TrackedEvent {
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
  marketCount: number;
  signalCount: number;
}

export type { TrackedEvent as PolymarketEvent };
