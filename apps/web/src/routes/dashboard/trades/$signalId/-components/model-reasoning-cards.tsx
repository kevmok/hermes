import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface Prediction {
  _id: string;
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  reasoning: string;
  responseTimeMs: number;
  confidence?: number;
}

interface ModelReasoningCardsProps {
  predictions: Prediction[];
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  NO: {
    icon: ArrowDown01Icon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
};

export function ModelReasoningCards({ predictions }: ModelReasoningCardsProps) {
  return (
    <div className='space-y-4'>
      {predictions.map((pred) => (
        <ReasoningCard key={pred._id} prediction={pred} />
      ))}
    </div>
  );
}

function ReasoningCard({ prediction }: { prediction: Prediction }) {
  const [isOpen, setIsOpen] = useState(true);
  const config = decisionConfig[prediction.decision];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn('border', config.borderColor, config.bgColor)}>
        <CollapsibleTrigger className='w-full text-left'>
          <CardHeader className='cursor-pointer hover:bg-white/[0.02] transition-colors p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <HugeiconsIcon
                  icon={config.icon}
                  size={20}
                  className={config.color}
                />
                <CardTitle className='text-base'>
                  {formatModelName(prediction.modelName)}
                </CardTitle>
                <Badge
                  variant='outline'
                  className={cn(
                    'border',
                    config.bgColor,
                    config.color,
                    config.borderColor,
                  )}
                >
                  {prediction.decision}
                </Badge>
              </div>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                  <span>{prediction.responseTimeMs}ms</span>
                  {prediction.confidence != null && (
                    <span>{prediction.confidence}% conf</span>
                  )}
                </div>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={16}
                  className={cn(
                    'text-muted-foreground transition-transform',
                    isOpen && 'rotate-180',
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className='pt-0 px-4 pb-4'>
            <div className='prose prose-sm dark:prose-invert max-w-none'>
              <p className='whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed'>
                {prediction.reasoning}
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function formatModelName(name: string): string {
  const names: Record<string, string> = {
    'claude-3-5-sonnet-20241022': 'Claude Sonnet 3.5',
    'gpt-4o': 'GPT-4o',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'claude-sonnet-4': 'Claude Sonnet 4',
    'gpt-4o-mini': 'GPT-4o Mini',
  };
  return names[name] || name;
}
