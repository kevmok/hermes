import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUpDownIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
} from '@hugeicons/core-free-icons';

// Signal type matching the backend response
export interface Signal {
  _id: string;
  _creationTime: number;
  consensusDecision: 'YES' | 'NO' | 'NO_TRADE';
  consensusPercentage: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  isHighConfidence: boolean;
  aggregatedReasoning: string;
  priceAtTrigger: number;
  signalTimestamp: number;
  triggerTrade:
    | { size: number; price: number; side: 'YES' | 'NO' }
    | Array<{ size: number; price: number; side: 'YES' | 'NO' }>;
  market: {
    _id: string;
    title: string;
    eventSlug: string;
    outcome?: 'YES' | 'NO' | 'INVALID' | null;
    resolvedAt?: number;
  } | null;
  voteDistribution?: { YES: number; NO: number; NO_TRADE: number };
  averageConfidence?: number;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getTotalTradeSize(
  trade: { size: number } | Array<{ size: number }>,
): number {
  return Array.isArray(trade)
    ? trade.reduce((sum, t) => sum + t.size, 0)
    : trade.size;
}

function formatUSD(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

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

export const signalColumns: ColumnDef<Signal>[] = [
  {
    accessorKey: 'signalTimestamp',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Time
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm">
        {formatTimeAgo(getValue() as number)}
      </span>
    ),
  },
  {
    accessorKey: 'market.title',
    header: 'Market',
    cell: ({ row }) => {
      const market = row.original.market;
      return (
        <div className="max-w-[280px]">
          <p className="font-medium truncate">{market?.title ?? 'Unknown Market'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {market?.eventSlug ?? '—'}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'consensusDecision',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Decision
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue, row }) => {
      const decision = getValue() as 'YES' | 'NO' | 'NO_TRADE';
      const config = decisionConfig[decision];
      const outcome = row.original.market?.outcome;
      const isResolved = outcome === 'YES' || outcome === 'NO';
      const isCorrect =
        isResolved && decision !== 'NO_TRADE' ? decision === outcome : null;

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`${config.bgColor} ${config.color} ${config.borderColor} border gap-1`}
          >
            <HugeiconsIcon icon={config.icon} size={12} />
            {config.label}
          </Badge>
          {isCorrect !== null && (
            <HugeiconsIcon
              icon={isCorrect ? CheckmarkCircle01Icon : CancelCircleIcon}
              size={16}
              className={isCorrect ? 'text-emerald-400' : 'text-red-400'}
            />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'consensusPercentage',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Consensus
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm font-medium tabular-nums">
        {(getValue() as number).toFixed(0)}%
      </span>
    ),
  },
  {
    accessorKey: 'confidenceLevel',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Confidence
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue }) => {
      const level = getValue() as 'high' | 'medium' | 'low';
      const colors = {
        high: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        medium: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        low: 'bg-white/5 text-white/50 border-white/10',
      };
      return (
        <Badge variant="outline" className={`${colors[level]} border uppercase text-[10px] tracking-wider`}>
          {level}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'priceAtTrigger',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Price @ Signal
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums">
        {((getValue() as number) * 100).toFixed(0)}%
      </span>
    ),
  },
  {
    id: 'triggerSize',
    accessorFn: (row) => getTotalTradeSize(row.triggerTrade),
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Trigger Size
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ getValue }) => {
      const size = getValue() as number;
      const isWhale = size >= 5000;
      return (
        <span className={`text-sm tabular-nums ${isWhale ? 'text-amber-400 font-medium' : ''}`}>
          {formatUSD(size)}
          {isWhale && ' 🐋'}
        </span>
      );
    },
  },
];
