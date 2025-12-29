import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { signalsQueries } from '@/lib/queries';
import { SignalsTable } from './-components/signals-table';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Activity03Icon,
  FlashIcon,
  ChartLineData01Icon,
  PercentCircleIcon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/trades/')({
  component: TradesPage,
});

function TradesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { data: signalStats, isLoading: statsLoading } = useQuery(
    signalsQueries.stats(),
  );

  const handleRowClick = (signalId: string) => {
    navigate({
      to: '/dashboard/trades/$signalId',
      params: { signalId },
    });
  };

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
                  <div className='absolute inset-0 bg-cyan-500/20 blur-xl rounded-full' />
                  <div className='relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'>
                    <HugeiconsIcon
                      icon={Activity03Icon}
                      size={24}
                      className='text-cyan-400'
                    />
                  </div>
                </div>
                <div>
                  <h1 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent'>
                    AI Signals
                  </h1>
                  <p className='text-sm text-cyan-300/60 font-mono'>
                    AI CONSENSUS TRADING SIGNALS
                  </p>
                </div>
              </div>
              <p className='text-muted-foreground max-w-lg'>
                Multi-model AI consensus signals generated from whale trades.
                High confidence signals have{' '}
                <span className='text-cyan-400 font-semibold'>80%+</span> model
                agreement.
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
              label='Total Signals'
              value={signalStats?.totalSignals ?? 0}
              icon={Activity03Icon}
              gradient='from-purple-500 to-pink-500'
              isLoading={statsLoading}
            />
            <StatCard
              label='High Confidence'
              value={signalStats?.highConfidenceSignals ?? 0}
              icon={FlashIcon}
              gradient='from-cyan-500 to-blue-500'
              isLoading={statsLoading}
              highlight
            />
            <StatCard
              label='Signals (24h)'
              value={signalStats?.signalsLast24h ?? 0}
              icon={ChartLineData01Icon}
              gradient='from-amber-500 to-orange-500'
              isLoading={statsLoading}
            />
            <StatCard
              label='High Conf %'
              value={`${(signalStats?.highConfidencePercentage ?? 0).toFixed(0)}%`}
              icon={PercentCircleIcon}
              gradient='from-emerald-500 to-teal-500'
              isLoading={statsLoading}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='p-6'>
        <SignalsTable filters={search} onRowClick={handleRowClick} />
      </div>
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
