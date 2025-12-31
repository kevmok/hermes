import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';

interface Prediction {
  _id: string;
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  confidence?: number;
}

interface ConsensusVizProps {
  decision: 'YES' | 'NO' | 'NO_TRADE';
  percentage: number;
  agreeingModels: number;
  totalModels: number;
  predictions: Prediction[];
  voteDistribution?: { YES: number; NO: number; NO_TRADE: number };
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    progressColor: '[&>div]:bg-emerald-500',
    label: 'YES',
  },
  NO: {
    icon: ArrowDown01Icon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    progressColor: '[&>div]:bg-red-500',
    label: 'NO',
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    progressColor: '[&>div]:bg-amber-500',
    label: 'NO TRADE',
  },
};

export function ConsensusViz({
  decision,
  percentage,
  agreeingModels,
  totalModels,
  predictions,
  voteDistribution,
}: ConsensusVizProps) {
  const config = decisionConfig[decision];

  return (
    <div className='space-y-6'>
      <Card className='border-border'>
        <CardContent className='p-6 space-y-4'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              Model Agreement
            </span>
            <span className='text-2xl font-bold tabular-nums'>
              {percentage.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={percentage}
            className={cn('h-3', config.progressColor)}
          />
          <p className='text-sm text-muted-foreground'>
            <span className='font-medium text-foreground'>
              {agreeingModels}
            </span>{' '}
            of{' '}
            <span className='font-medium text-foreground'>{totalModels}</span>{' '}
            models agreed on{' '}
            <span className={cn('font-semibold', config.color)}>
              {config.label}
            </span>
          </p>

          {voteDistribution && (
            <div className='flex items-center gap-6 pt-4 border-t border-border'>
              <div className='flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-emerald-500' />
                <span className='text-sm text-muted-foreground'>
                  YES:{' '}
                  <span className='font-medium text-foreground'>
                    {voteDistribution.YES}
                  </span>
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-red-500' />
                <span className='text-sm text-muted-foreground'>
                  NO:{' '}
                  <span className='font-medium text-foreground'>
                    {voteDistribution.NO}
                  </span>
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='w-3 h-3 rounded-full bg-amber-500' />
                <span className='text-sm text-muted-foreground'>
                  HOLD:{' '}
                  <span className='font-medium text-foreground'>
                    {voteDistribution.NO_TRADE}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        {predictions.map((pred) => {
          const predConfig = decisionConfig[pred.decision];
          return (
            <Card
              key={pred._id}
              className={cn(
                'border-2 transition-colors',
                predConfig.bgColor,
                predConfig.borderColor,
              )}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='font-medium'>
                    {formatModelName(pred.modelName)}
                  </span>
                  <div className='flex items-center gap-1.5'>
                    <HugeiconsIcon
                      icon={predConfig.icon}
                      size={16}
                      className={predConfig.color}
                    />
                    <Badge
                      variant='outline'
                      className={cn(
                        'border',
                        predConfig.bgColor,
                        predConfig.color,
                        predConfig.borderColor,
                      )}
                    >
                      {pred.decision}
                    </Badge>
                  </div>
                </div>
                {pred.confidence != null && (
                  <span className='text-xs text-muted-foreground'>
                    {pred.confidence}% confidence
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatModelName(name: string): string {
  const names: Record<string, string> = {
    'claude-3-5-sonnet-20241022': 'Claude Sonnet',
    'gpt-4o': 'GPT-4o',
    'gemini-1.5-pro': 'Gemini Pro',
    'claude-sonnet-4': 'Claude',
    'gpt-4o-mini': 'GPT-4o Mini',
  };
  return names[name] || name;
}
