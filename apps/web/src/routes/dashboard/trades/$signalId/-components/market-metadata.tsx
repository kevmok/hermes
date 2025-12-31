import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  Dollar01Icon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
} from '@hugeicons/core-free-icons';

interface MarketMetadataProps {
  priceAtTrigger: number;
  signalTimestamp: number;
  triggerTrade: {
    size: number;
    price: number;
    side: 'YES' | 'NO';
    timestamp: number;
  };
  outcome?: 'YES' | 'NO' | 'INVALID' | null;
  resolvedAt?: number;
  consensusDecision: 'YES' | 'NO' | 'NO_TRADE';
}

export function MarketMetadata({
  priceAtTrigger,
  signalTimestamp,
  triggerTrade,
  outcome,
  resolvedAt,
  consensusDecision,
}: MarketMetadataProps) {
  const isResolved = outcome === 'YES' || outcome === 'NO';
  const isCorrect =
    isResolved && consensusDecision !== 'NO_TRADE'
      ? consensusDecision === outcome
      : null;

  return (
    <div className='space-y-4'>
      {isResolved && (
        <Card className='border-border'>
          <CardContent className='p-6'>
            <h3 className='text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider'>
              Market Outcome
            </h3>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground'>Resolved:</span>
                <Badge
                  variant='outline'
                  className={
                    outcome === 'YES'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }
                >
                  {outcome}
                </Badge>
              </div>
              {isCorrect !== null && (
                <Badge
                  variant='outline'
                  className={
                    isCorrect
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                  }
                >
                  <HugeiconsIcon
                    icon={isCorrect ? CheckmarkCircle01Icon : CancelCircleIcon}
                    size={12}
                    className='mr-1'
                  />
                  {isCorrect ? 'CORRECT' : 'INCORRECT'}
                </Badge>
              )}
            </div>
            {resolvedAt && (
              <p className='text-xs text-muted-foreground mt-2'>
                Resolved on {new Date(resolvedAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className='border-border'>
        <CardContent className='p-6'>
          <h3 className='text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider'>
            Trigger Trade
          </h3>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <HugeiconsIcon icon={Dollar01Icon} size={14} />
                <span className='text-xs'>Size</span>
              </div>
              <span className='text-xl font-bold tabular-nums'>
                ${triggerTrade.size.toLocaleString()}
              </span>
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <span className='text-xs'>Side @ Price</span>
              </div>
              <span
                className={`text-xl font-bold tabular-nums ${triggerTrade.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {triggerTrade.side} @ {(triggerTrade.price * 100).toFixed(1)}%
              </span>
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <span className='text-xs'>Price @ Trigger</span>
              </div>
              <span className='text-xl font-bold tabular-nums'>
                {(priceAtTrigger * 100).toFixed(1)}%
              </span>
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <HugeiconsIcon icon={Clock01Icon} size={14} />
                <span className='text-xs'>Signal Time</span>
              </div>
              <span className='text-sm'>
                {new Date(signalTimestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
