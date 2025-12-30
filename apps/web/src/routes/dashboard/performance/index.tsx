import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '../-components/stat-card';
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
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="space-y-1 mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Performance
            </h1>
            <p className="text-sm text-muted-foreground">
              Signal accuracy metrics and historical performance data.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              label="Win Rate"
              value={`${stats?.winRate ?? 0}%`}
              icon={Award01Icon}
              variant="success"
              trend={stats?.predictionsEvaluated ? {
                value: `${stats.correctPredictions}/${stats.predictionsEvaluated}`,
                positive: (stats?.winRate ?? 0) >= 50,
              } : undefined}
              isLoading={statsLoading}
            />
            <StatCard
              label="High Conf Win Rate"
              value={`${stats?.highConfidenceWinRate ?? 0}%`}
              icon={CheckmarkCircle01Icon}
              isLoading={statsLoading}
            />
            <StatCard
              label="Simulated ROI"
              value={`${(stats?.simulatedROI ?? 0) >= 0 ? '+' : ''}${stats?.simulatedROI ?? 0}%`}
              icon={Dollar01Icon}
              variant={(stats?.simulatedROI ?? 0) >= 0 ? 'success' : 'danger'}
              isLoading={statsLoading}
            />
            <StatCard
              label="Total Signals"
              value={stats?.totalSignals?.toLocaleString() ?? '0'}
              icon={ChartLineData01Icon}
              trend={{
                value: `${stats?.signalsLast7d ?? 0} this week`,
                positive: true,
              }}
              isLoading={statsLoading}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        {/* Decision Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon
                  icon={ArrowUp01Icon}
                  size={16}
                  className="text-green-600 dark:text-green-400"
                />
                YES Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <DecisionBreakdownCard data={accuracyBreakdown?.YES} color="green" />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  className="text-red-600 dark:text-red-400"
                />
                NO Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <DecisionBreakdownCard data={accuracyBreakdown?.NO} color="red" />
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HugeiconsIcon
                  icon={MinusSignIcon}
                  size={16}
                  className="text-amber-600 dark:text-amber-400"
                />
                NO TRADE Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <div className="space-y-3">
                  <div className="font-mono-data text-3xl font-bold">
                    {accuracyBreakdown?.NO_TRADE.total ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Skipped due to uncertainty
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confidence Calibration */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HugeiconsIcon
                icon={ChartLineData01Icon}
                size={18}
                className="text-primary"
              />
              Confidence Calibration
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How accurate are signals at each confidence level?
            </p>
          </CardHeader>
          <CardContent>
            {calibrationLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {calibration?.map((bracket) => (
                  <CalibrationRow key={bracket.label} bracket={bracket} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HugeiconsIcon
                icon={Clock01Icon}
                size={18}
                className="text-primary"
              />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Last 24h</span>
                  <div className="font-mono-data text-2xl font-bold">
                    {stats?.signalsLast24h ?? 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Last 7d</span>
                  <div className="font-mono-data text-2xl font-bold">
                    {stats?.signalsLast7d ?? 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Evaluated</span>
                  <div className="font-mono-data text-2xl font-bold">
                    {stats?.predictionsEvaluated ?? 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Avg Consensus (Wins)</span>
                  <div className="font-mono-data text-2xl font-bold">
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

// Helper Components

interface DecisionBreakdownProps {
  data?: { total: number; evaluated: number; correct: number; winRate: number };
  color: 'green' | 'red';
}

function DecisionBreakdownCard({ data, color }: DecisionBreakdownProps) {
  if (!data) return null;

  const colorClasses = {
    green: {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500',
      badge: 'badge-success',
    },
    red: {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500',
      badge: 'badge-danger',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className={`font-mono-data text-3xl font-bold ${classes.text}`}>
          {data.winRate}%
        </span>
        <Badge className={classes.badge}>
          {data.correct}/{data.evaluated} correct
        </Badge>
      </div>
      <Progress value={data.winRate} className="h-2" />
      <p className="text-xs text-muted-foreground">
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
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium w-20">{bracket.label}</span>
      <div className="flex-1">
        <Progress value={bracket.actualAccuracy} className="h-3" />
      </div>
      <div className="flex items-center gap-2 w-32 justify-end">
        <span className="font-mono-data text-sm font-bold">
          {bracket.actualAccuracy}%
        </span>
        <span className="text-xs text-muted-foreground">
          ({bracket.correct}/{bracket.total})
        </span>
        {bracket.total > 0 && (
          <HugeiconsIcon
            icon={isCalibrated ? CheckmarkCircle01Icon : CancelCircleIcon}
            size={14}
            className={isCalibrated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
          />
        )}
      </div>
    </div>
  );
}
