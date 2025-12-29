import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  ChartLineData01Icon,
  Dollar01Icon,
  Clock01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/performance/')({
  component: PerformancePage,
});

function PerformancePage() {
  const { data: stats, isLoading: statsLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  const { data: accuracyBreakdown, isLoading: breakdownLoading } = useQuery(
    convexQuery(api.performanceMetrics.getSignalAccuracyByDecision, {}),
  );

  const { data: calibration, isLoading: calibrationLoading } = useQuery(
    convexQuery(api.performanceMetrics.getConfidenceCalibration, {}),
  );

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='relative overflow-hidden border-b border-cyan-500/10'>
        <div className='absolute inset-0 bg-gradient-to-br from-purple-950/40 via-cyan-950/30 to-background' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent' />

        <div className='relative px-6 py-8'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='relative'>
              <div className='absolute inset-0 bg-cyan-500/20 blur-xl rounded-full' />
              <div className='relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'>
                <HugeiconsIcon
                  icon={Award01Icon}
                  size={24}
                  className='text-cyan-400'
                />
              </div>
            </div>
            <div>
              <h1 className='text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent'>
                Performance
              </h1>
              <p className='text-sm text-cyan-300/60 font-mono'>
                AI SIGNAL ACCURACY & METRICS
              </p>
            </div>
          </div>

          {/* Main Stats Grid */}
          {statsLoading ? (
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className='h-28 rounded-xl' />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
              <StatCard
                label='Win Rate'
                value={`${stats?.winRate ?? 0}%`}
                subValue={`${stats?.correctPredictions ?? 0}/${stats?.predictionsEvaluated ?? 0} correct`}
                icon={Award01Icon}
                gradient='from-emerald-500 to-teal-500'
                highlight
              />
              <StatCard
                label='High Conf Win Rate'
                value={`${stats?.highConfidenceWinRate ?? 0}%`}
                subValue={`On ${stats?.highConfidenceSignals ?? 0} signals`}
                icon={CheckmarkCircle01Icon}
                gradient='from-cyan-500 to-blue-500'
              />
              <StatCard
                label='Simulated ROI'
                value={`${(stats?.simulatedROI ?? 0) >= 0 ? '+' : ''}${stats?.simulatedROI ?? 0}%`}
                subValue='Flat bet model'
                icon={Dollar01Icon}
                gradient={
                  (stats?.simulatedROI ?? 0) >= 0
                    ? 'from-emerald-500 to-green-500'
                    : 'from-red-500 to-pink-500'
                }
              />
              <StatCard
                label='Total Signals'
                value={stats?.totalSignals ?? 0}
                subValue={`${stats?.signalsLast7d ?? 0} this week`}
                icon={ChartLineData01Icon}
                gradient='from-purple-500 to-pink-500'
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className='p-6 space-y-6 max-w-6xl'>
        {/* Decision Breakdown */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <Card className='border-white/5 bg-white/[0.02]'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <HugeiconsIcon
                  icon={ArrowUp01Icon}
                  size={16}
                  className='text-emerald-400'
                />
                YES Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className='h-20' />
              ) : (
                <DecisionBreakdownCard
                  data={accuracyBreakdown?.YES}
                  color='emerald'
                />
              )}
            </CardContent>
          </Card>

          <Card className='border-white/5 bg-white/[0.02]'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  className='text-red-400'
                />
                NO Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className='h-20' />
              ) : (
                <DecisionBreakdownCard
                  data={accuracyBreakdown?.NO}
                  color='red'
                />
              )}
            </CardContent>
          </Card>

          <Card className='border-white/5 bg-white/[0.02]'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium flex items-center gap-2'>
                <HugeiconsIcon
                  icon={MinusSignIcon}
                  size={16}
                  className='text-amber-400'
                />
                NO TRADE Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className='h-20' />
              ) : (
                <div className='space-y-3'>
                  <div className='text-3xl font-bold tabular-nums'>
                    {accuracyBreakdown?.NO_TRADE.total ?? 0}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Skipped due to uncertainty
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confidence Calibration */}
        <Card className='border-white/5 bg-white/[0.02]'>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                size={18}
                className='text-cyan-400'
              />
              Confidence Calibration
            </CardTitle>
            <p className='text-sm text-muted-foreground'>
              How accurate are signals at each confidence level?
            </p>
          </CardHeader>
          <CardContent>
            {calibrationLoading ? (
              <div className='space-y-4'>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-12' />
                ))}
              </div>
            ) : (
              <div className='space-y-4'>
                {calibration?.map((bracket) => (
                  <CalibrationRow key={bracket.label} bracket={bracket} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className='border-white/5 bg-white/[0.02]'>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <HugeiconsIcon
                icon={Clock01Icon}
                size={18}
                className='text-purple-400'
              />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className='h-32' />
            ) : (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Last 24h</span>
                  <div className='text-2xl font-bold tabular-nums'>
                    {stats?.signalsLast24h ?? 0}
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Last 7d</span>
                  <div className='text-2xl font-bold tabular-nums'>
                    {stats?.signalsLast7d ?? 0}
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Evaluated
                  </span>
                  <div className='text-2xl font-bold tabular-nums'>
                    {stats?.predictionsEvaluated ?? 0}
                  </div>
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>
                    Avg Consensus (Wins)
                  </span>
                  <div className='text-2xl font-bold tabular-nums'>
                    {stats?.avgConsensusOnWins ?? 0}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Components

interface StatCardProps {
  label: string;
  value: string | number;
  subValue: string;
  icon: typeof Award01Icon;
  gradient: string;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  gradient,
  highlight,
}: StatCardProps) {
  return (
    <div className='group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm'>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`}
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
        <span
          className={`text-2xl font-bold tabular-nums tracking-tight ${highlight ? 'text-emerald-400' : 'text-white'}`}
        >
          {value}
        </span>
        <p className='text-xs text-muted-foreground mt-1'>{subValue}</p>
      </div>
    </div>
  );
}

interface DecisionBreakdownProps {
  data?: { total: number; evaluated: number; correct: number; winRate: number };
  color: 'emerald' | 'red';
}

function DecisionBreakdownCard({ data, color }: DecisionBreakdownProps) {
  if (!data) return null;

  const colorClasses = {
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500',
      badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className='space-y-3'>
      <div className='flex items-baseline justify-between'>
        <span className={`text-3xl font-bold tabular-nums ${classes.text}`}>
          {data.winRate}%
        </span>
        <Badge variant='outline' className={classes.badge}>
          {data.correct}/{data.evaluated} correct
        </Badge>
      </div>
      <Progress value={data.winRate} className={`h-2 [&>div]:${classes.bg}`} />
      <p className='text-xs text-muted-foreground'>
        {data.total} total signals, {data.evaluated} evaluated
      </p>
    </div>
  );
}

interface CalibrationRowProps {
  bracket: {
    label: string;
    correct: number;
    total: number;
    actualAccuracy: number;
  };
}

function CalibrationRow({ bracket }: CalibrationRowProps) {
  const isCalibrated = bracket.total > 0 && bracket.actualAccuracy >= 50;

  return (
    <div className='flex items-center gap-4'>
      <span className='text-sm font-medium w-20'>{bracket.label}</span>
      <div className='flex-1'>
        <Progress
          value={bracket.actualAccuracy}
          className='h-3 [&>div]:bg-cyan-500'
        />
      </div>
      <div className='flex items-center gap-2 w-32 justify-end'>
        <span className='text-sm font-bold tabular-nums'>
          {bracket.actualAccuracy}%
        </span>
        <span className='text-xs text-muted-foreground'>
          ({bracket.correct}/{bracket.total})
        </span>
        {bracket.total > 0 && (
          <HugeiconsIcon
            icon={isCalibrated ? CheckmarkCircle01Icon : CancelCircleIcon}
            size={14}
            className={isCalibrated ? 'text-emerald-400' : 'text-red-400'}
          />
        )}
      </div>
    </div>
  );
}
