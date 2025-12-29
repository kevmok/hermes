import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { Link } from '@tanstack/react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  ChartLineData01Icon,
  Dollar01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';

export function StatsMarquee() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  if (isLoading || !stats) {
    return (
      <div className='h-9 bg-muted/20 border-b border-sidebar-border/50 animate-pulse' />
    );
  }

  const metrics = [
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      subValue: `${stats.correctPredictions}/${stats.predictionsEvaluated}`,
      icon: Award01Icon,
      color: 'text-emerald-400',
    },
    {
      label: 'Total Signals',
      value: stats.totalSignals.toLocaleString(),
      subValue: `${stats.highConfidenceSignals} high conf`,
      icon: ChartLineData01Icon,
      color: 'text-cyan-400',
    },
    {
      label: 'Simulated ROI',
      value: `${stats.simulatedROI >= 0 ? '+' : ''}${stats.simulatedROI.toFixed(1)}%`,
      subValue: null,
      icon: Dollar01Icon,
      color: stats.simulatedROI >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Last 24h',
      value: stats.signalsLast24h.toLocaleString(),
      subValue: `${stats.signalsLast7d} this week`,
      icon: Clock01Icon,
      color: 'text-purple-400',
    },
  ];

  return (
    <Link
      to='/dashboard/performance'
      className='block group'
    >
      <div className='h-9 bg-muted/10 border-b border-sidebar-border/50 overflow-hidden hover:bg-muted/20 transition-colors'>
        <div className='flex h-full items-center animate-marquee whitespace-nowrap'>
          {/* Duplicate content for seamless loop */}
          {[0, 1].map((i) => (
            <div key={i} className='flex items-center gap-8 px-6'>
              {metrics.map((metric) => (
                <div
                  key={`${i}-${metric.label}`}
                  className='flex items-center gap-2'
                >
                  <HugeiconsIcon
                    icon={metric.icon}
                    size={14}
                    className={metric.color}
                  />
                  <span className='text-xs text-muted-foreground'>
                    {metric.label}:
                  </span>
                  <span className={`text-xs font-semibold ${metric.color}`}>
                    {metric.value}
                  </span>
                  {metric.subValue && (
                    <span className='text-[10px] text-muted-foreground/60'>
                      ({metric.subValue})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
