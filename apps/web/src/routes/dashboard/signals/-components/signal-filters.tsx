import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type DecisionFilter = 'all' | 'YES' | 'NO' | 'NO_TRADE';
export type ConfidenceFilter = 'all' | 'high';

interface SignalFiltersProps {
  decisionFilter: DecisionFilter;
  confidenceFilter: ConfidenceFilter;
  onDecisionChange: (value: DecisionFilter) => void;
  onConfidenceChange: (value: ConfidenceFilter) => void;
}

export function SignalFilters({
  decisionFilter,
  confidenceFilter,
  onDecisionChange,
  onConfidenceChange,
}: SignalFiltersProps) {
  return (
    <div className='flex flex-wrap gap-4'>
      <div className='space-y-1.5'>
        <span className='text-xs text-muted-foreground'>Decision</span>
        <Tabs
          value={decisionFilter}
          onValueChange={(val) => onDecisionChange(val as DecisionFilter)}
        >
          <TabsList variant='default'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='YES'>
              <span className='text-emerald-400'>YES</span>
            </TabsTrigger>
            <TabsTrigger value='NO'>
              <span className='text-red-400'>NO</span>
            </TabsTrigger>
            <TabsTrigger value='NO_TRADE'>
              <span className='text-yellow-400'>SKIP</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className='space-y-1.5'>
        <span className='text-xs text-muted-foreground'>Confidence</span>
        <Tabs
          value={confidenceFilter}
          onValueChange={(val) => onConfidenceChange(val as ConfidenceFilter)}
        >
          <TabsList variant='default'>
            <TabsTrigger value='all'>All</TabsTrigger>
            <TabsTrigger value='high'>High Only</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
