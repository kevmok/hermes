import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { tradesQueries, signalsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import { TradeFeed } from './-components/trade-feed';
import { SignalCard } from './-components/signal-card';
import { TradeDetailModal } from './-components/trade-detail-modal';
import { DataLoading, DataEmpty, DataError } from '@/components/ui/data-states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Activity03Icon,
  FlashIcon,
  ChartLineData01Icon,
  MoneyBag02Icon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/trades/')({
  loader: async () => {
    // Prefetch both trades and signals data in parallel
    await Promise.all([
      queryClient.ensureQueryData({
        ...tradesQueries.whales({ limit: 20 }),
        revalidateIfStale: true,
      }),
      queryClient.ensureQueryData({
        ...signalsQueries.paginated({ limit: 10, onlyHighConfidence: false }),
        revalidateIfStale: true,
      }),
      queryClient.ensureQueryData({
        ...tradesQueries.stats(),
        revalidateIfStale: true,
      }),
    ]);
    return {};
  },
  component: TradesPage,
});

function TradesPage() {
  const [selectedTradeSlug, setSelectedTradeSlug] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'trades' | 'signals'>('trades');

  const { data: tradeStats, isLoading: statsLoading } = useQuery(
    tradesQueries.stats(),
  );

  const {
    data: signalsData,
    isLoading: signalsLoading,
    error: signalsError,
    refetch: refetchSignals,
  } = useQuery(signalsQueries.paginated({ limit: 20 }));

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='relative overflow-hidden border-b border-cyan-500/10'>
        {/* Animated gradient mesh background */}
        <div className='absolute inset-0 bg-gradient-to-br from-purple-950/40 via-cyan-950/30 to-background' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent' />

        {/* Grid pattern overlay */}
        <div
          className='absolute inset-0 opacity-[0.03]'
          style={{
            backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.3) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className='relative px-6 py-8'>
          {/* Header */}
          <div className='flex items-start justify-between mb-6'>
            <div className='space-y-2'>
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-purple-500/20 blur-xl rounded-full' />
                  <div className='relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'>
                    <HugeiconsIcon
                      icon={MoneyBag02Icon}
                      size={24}
                      className='text-purple-400'
                    />
                  </div>
                </div>
                <div>
                  <h1 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-cyan-200 bg-clip-text text-transparent'>
                    Whale Trades
                  </h1>
                  <p className='text-sm text-purple-300/60 font-mono'>
                    LIVE FEED + AI SIGNALS
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground max-w-lg'>
                Real-time whale trades{' '}
                <span className='text-purple-400 font-semibold'>$500+</span>{' '}
                with AI-powered consensus signals for trading decisions.
              </p>
            </div>

            {/* Live indicator */}
            <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500' />
              </span>
              <span className='text-xs font-medium text-emerald-400'>LIVE</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            <StatCard
              label='Total Trades'
              value={tradeStats?.totalTrades ?? 0}
              icon={Activity03Icon}
              gradient='from-purple-500 to-pink-500'
              isLoading={statsLoading}
            />
            <StatCard
              label='Whale Trades'
              value={tradeStats?.whaleTrades ?? 0}
              icon={FlashIcon}
              gradient='from-cyan-500 to-blue-500'
              isLoading={statsLoading}
            />
            <StatCard
              label='Total Volume'
              value={formatVolume(tradeStats?.totalVolume ?? 0)}
              icon={ChartLineData01Icon}
              gradient='from-amber-500 to-orange-500'
              isLoading={statsLoading}
            />
            <StatCard
              label='Whale Volume'
              value={formatVolume(tradeStats?.whaleVolume ?? 0)}
              icon={MoneyBag02Icon}
              gradient='from-emerald-500 to-teal-500'
              isLoading={statsLoading}
              highlight
            />
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className='p-6'>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'trades' | 'signals')}
        >
          <TabsList className='mb-6'>
            <TabsTrigger value='trades' className='gap-2'>
              <HugeiconsIcon icon={MoneyBag02Icon} size={16} />
              Live Trades
            </TabsTrigger>
            <TabsTrigger value='signals' className='gap-2'>
              <HugeiconsIcon icon={Activity03Icon} size={16} />
              AI Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value='trades' className='mt-0'>
            <TradeFeed onTradeSelect={setSelectedTradeSlug} />
          </TabsContent>

          <TabsContent value='signals' className='mt-0'>
            {signalsLoading ? (
              <DataLoading count={6} variant='card' />
            ) : signalsError ? (
              <DataError
                message='Failed to load signals'
                onRetry={() => refetchSignals()}
              />
            ) : !signalsData?.items?.length ? (
              <DataEmpty
                title='No signals yet'
                description='AI signals will appear here when whale trades trigger analysis.'
                icon={Activity03Icon}
              />
            ) : (
              <div className='grid gap-4 md:grid-cols-2'>
                {signalsData.items.map((signal, index) => (
                  <SignalCard key={signal._id} signal={signal} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Trade Detail Modal */}
      <TradeDetailModal
        slug={selectedTradeSlug}
        open={!!selectedTradeSlug}
        onOpenChange={(open) => !open && setSelectedTradeSlug(null)}
      />
    </div>
  );
}

// Helper components
interface StatCardProps {
  label: string;
  value: number | string;
  icon: typeof Activity03Icon;
  gradient: string;
  isLoading?: boolean;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  isLoading,
  highlight,
}: StatCardProps) {
  return (
    <div className='group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]'>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-50`}
      />

      <div className='relative p-4'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase'>
            {label}
          </span>
          <div
            className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} opacity-80`}
          >
            <HugeiconsIcon icon={Icon} size={12} className='text-white' />
          </div>
        </div>

        {isLoading ? (
          <div className='h-8 w-16 bg-white/5 rounded animate-pulse' />
        ) : (
          <span
            className={`text-2xl font-bold tabular-nums tracking-tight ${highlight ? 'text-emerald-400' : 'text-white'}`}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}
