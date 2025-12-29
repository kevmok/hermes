import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { signalsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import type { Id } from 'backend/convex/_generated/dataModel';
import { ConsensusViz } from './-components/consensus-viz';
import { ModelReasoningCards } from './-components/model-reasoning-cards';
import { MarketMetadata } from './-components/market-metadata';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/trades/$signalId/')({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData({
      ...signalsQueries.withPredictions(params.signalId as Id<'signals'>),
      revalidateIfStale: true,
    });
    return {};
  },
  component: TradeDetailPage,
});

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'BUY YES',
  },
  NO: {
    icon: ArrowDown01Icon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'BUY NO',
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    label: 'NO TRADE',
  },
};

function TradeDetailPage() {
  const { signalId } = Route.useParams();

  const {
    data: signal,
    isLoading,
    error,
  } = useQuery(signalsQueries.withPredictions(signalId as Id<'signals'>));

  if (isLoading) {
    return <TradeDetailSkeleton />;
  }

  if (error || !signal) {
    return (
      <div className='p-6 flex flex-col items-center justify-center min-h-[400px]'>
        <p className='text-muted-foreground mb-4'>Signal not found</p>
        <Link
          to='/dashboard/trades'
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Back to Trades
        </Link>
      </div>
    );
  }

  const config = decisionConfig[signal.consensusDecision];

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='relative overflow-hidden border-b border-cyan-500/10'>
        <div className='absolute inset-0 bg-gradient-to-br from-purple-950/40 via-cyan-950/30 to-background' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent' />

        <div className='relative px-6 py-8'>
          {/* Back Button */}
          <Link
            to='/dashboard/trades'
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'mb-6 -ml-2',
            )}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className='mr-2' />
            Back to Trades
          </Link>

          {/* Title and Decision */}
          <div className='flex items-start gap-4'>
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl ${config.bgColor} ${config.borderColor} border shrink-0`}
            >
              <HugeiconsIcon
                icon={config.icon}
                size={28}
                className={config.color}
              />
            </div>
            <div className='flex-1 min-w-0'>
              <h1 className='text-2xl font-bold mb-3'>
                {signal.market?.title ?? 'Unknown Market'}
              </h1>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant='outline'
                  className={`${config.bgColor} ${config.color} ${config.borderColor} border text-sm`}
                >
                  {config.label}
                </Badge>
                <Badge
                  variant='outline'
                  className={`${
                    signal.confidenceLevel === 'high'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : signal.confidenceLevel === 'medium'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-white/5 text-white/50 border-white/10'
                  } border`}
                >
                  {signal.confidenceLevel} confidence
                </Badge>
                <Badge variant='secondary' className='text-xs'>
                  {signal.consensusPercentage.toFixed(0)}% consensus
                </Badge>
              </div>
              <p className='text-sm text-muted-foreground mt-2'>
                Signal generated {formatRelativeTime(signal.signalTimestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='p-6 space-y-8 max-w-5xl'>
        {/* Consensus Visualization */}
        <section>
          <h2 className='text-lg font-semibold mb-4'>Model Consensus</h2>
          <ConsensusViz
            decision={signal.consensusDecision}
            percentage={signal.consensusPercentage}
            agreeingModels={signal.agreeingModels}
            totalModels={signal.totalModels}
            predictions={signal.predictions || []}
            voteDistribution={signal.voteDistribution}
          />
        </section>

        <Separator className='bg-white/[0.06]' />

        {/* AI Reasoning */}
        {signal.predictions && signal.predictions.length > 0 && (
          <section>
            <h2 className='text-lg font-semibold mb-4'>AI Analysis</h2>
            <ModelReasoningCards predictions={signal.predictions} />
          </section>
        )}

        {signal.predictions && signal.predictions.length > 0 && (
          <Separator className='bg-white/[0.06]' />
        )}

        {/* Aggregated Reasoning */}
        <section>
          <h2 className='text-lg font-semibold mb-4'>Aggregated Reasoning</h2>
          <p className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed p-4 rounded-lg border border-white/5 bg-white/[0.02]'>
            {signal.aggregatedReasoning}
          </p>
        </section>

        {/* Key Factors & Risks */}
        {(signal.aggregatedKeyFactors?.length ||
          signal.aggregatedRisks?.length) && (
          <>
            <Separator className='bg-white/[0.06]' />
            <section className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {signal.aggregatedKeyFactors &&
                signal.aggregatedKeyFactors.length > 0 && (
                  <div className='p-4 rounded-lg border border-white/5 bg-white/[0.02]'>
                    <h3 className='text-sm font-semibold mb-3 text-emerald-400 uppercase tracking-wider'>
                      Key Factors
                    </h3>
                    <ul className='space-y-2 text-sm text-muted-foreground'>
                      {signal.aggregatedKeyFactors.map((factor, i) => (
                        <li key={i} className='flex gap-2'>
                          <span className='text-emerald-400'>•</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {signal.aggregatedRisks && signal.aggregatedRisks.length > 0 && (
                <div className='p-4 rounded-lg border border-white/5 bg-white/[0.02]'>
                  <h3 className='text-sm font-semibold mb-3 text-red-400 uppercase tracking-wider'>
                    Risks
                  </h3>
                  <ul className='space-y-2 text-sm text-muted-foreground'>
                    {signal.aggregatedRisks.map((risk, i) => (
                      <li key={i} className='flex gap-2'>
                        <span className='text-red-400'>•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}

        <Separator className='bg-white/[0.06]' />

        {/* Market Metadata */}
        <section>
          <h2 className='text-lg font-semibold mb-4'>Market Details</h2>
          <MarketMetadata
            priceAtTrigger={signal.priceAtTrigger}
            eventSlug={signal.market?.eventSlug}
            signalTimestamp={signal.signalTimestamp}
            triggerTrade={signal.triggerTrade}
            outcome={signal.market?.outcome}
            resolvedAt={signal.market?.resolvedAt}
            consensusDecision={signal.consensusDecision}
          />
        </section>
      </div>
    </div>
  );
}

function TradeDetailSkeleton() {
  return (
    <div className='min-h-screen'>
      <div className='px-6 py-8 border-b border-white/5'>
        <Skeleton className='h-8 w-32 mb-6' />
        <div className='flex items-start gap-4'>
          <Skeleton className='h-14 w-14 rounded-xl' />
          <div className='flex-1'>
            <Skeleton className='h-8 w-96 mb-3' />
            <div className='flex gap-2'>
              <Skeleton className='h-6 w-20' />
              <Skeleton className='h-6 w-28' />
              <Skeleton className='h-6 w-24' />
            </div>
          </div>
        </div>
      </div>
      <div className='p-6 space-y-8'>
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-64 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
