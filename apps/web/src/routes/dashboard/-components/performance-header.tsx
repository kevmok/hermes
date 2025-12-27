import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { Skeleton } from '@/components/ui/skeleton';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  ChartLineData01Icon,
  Dollar01Icon,
  Clock01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';

export function PerformanceHeader() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  if (isLoading) {
    return <PerformanceHeaderSkeleton />;
  }

  const metrics = [
    {
      label: 'Win Rate',
      value: stats ? `${stats.winRate.toFixed(1)}%` : '—',
      subtext: stats
        ? `${stats.correctPredictions}/${stats.predictionsEvaluated}`
        : '',
      icon: Award01Icon,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      trend:
        stats && stats.winRate > 50
          ? 'up'
          : stats && stats.winRate < 50
            ? 'down'
            : null,
    },
    {
      label: 'Total Signals',
      value: stats?.totalSignals.toLocaleString() ?? '—',
      subtext: `${stats?.highConfidenceSignals ?? 0} high confidence`,
      icon: ChartLineData01Icon,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      trend: null,
    },
    {
      label: 'Simulated ROI',
      value: stats
        ? `${stats.simulatedROI >= 0 ? '+' : ''}${stats.simulatedROI.toFixed(1)}%`
        : '—',
      subtext: 'Flat $100 bets',
      icon: Dollar01Icon,
      color:
        stats?.simulatedROI && stats.simulatedROI >= 0
          ? 'text-emerald-400'
          : 'text-red-400',
      bgColor:
        stats?.simulatedROI && stats.simulatedROI >= 0
          ? 'bg-emerald-500/10'
          : 'bg-red-500/10',
      trend:
        stats && stats.simulatedROI >= 0
          ? 'up'
          : stats && stats.simulatedROI < 0
            ? 'down'
            : null,
    },
    {
      label: 'Last 24h',
      value: stats?.signalsLast24h.toLocaleString() ?? '—',
      subtext: `${stats?.signalsLast7d ?? 0} this week`,
      icon: Clock01Icon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      trend: null,
    },
  ];

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`${metric.bgColor} rounded-xl p-4 border border-sidebar-border/50`}
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-xs text-muted-foreground font-medium'>
              {metric.label}
            </span>
            <HugeiconsIcon
              icon={metric.icon}
              size={16}
              className={metric.color}
            />
          </div>
          <div className='flex items-baseline gap-2'>
            <span className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
            {metric.trend && (
              <HugeiconsIcon
                icon={metric.trend === 'up' ? ArrowUp01Icon : ArrowDown01Icon}
                size={14}
                className={
                  metric.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                }
              />
            )}
          </div>
          {metric.subtext && (
            <span className='text-xs text-muted-foreground'>
              {metric.subtext}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function PerformanceHeaderSkeleton() {
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className='bg-sidebar/50 rounded-xl p-4 border border-sidebar-border/50'
        >
          <div className='flex items-center justify-between mb-2'>
            <Skeleton className='h-3 w-16' />
            <Skeleton className='h-4 w-4 rounded' />
          </div>
          <Skeleton className='h-8 w-20 mb-1' />
          <Skeleton className='h-3 w-24' />
        </div>
      ))}
    </div>
  );
}
