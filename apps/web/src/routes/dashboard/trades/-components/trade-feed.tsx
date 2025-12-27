import { useQuery } from '@tanstack/react-query';
import { tradesQueries } from '@/lib/queries';
import { DataLoading, DataEmpty, DataError } from '@/components/ui/data-states';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  UserIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';

interface TradeFeedProps {
  onTradeSelect?: (slug: string) => void;
}

interface Trade {
  _id: string;
  _creationTime: number;
  conditionId: string;
  slug: string;
  eventSlug: string;
  title: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  proxyWallet: string;
  outcome: string;
  outcomeIndex: number;
  transactionHash?: string;
  isWhale: boolean;
  traderName?: string;
  traderPseudonym?: string;
  signalId?: string;
}

export function TradeFeed({ onTradeSelect }: TradeFeedProps) {
  const { data, isLoading, error, refetch } = useQuery(
    tradesQueries.whales({ limit: 30 }),
  );

  if (isLoading) {
    return <DataLoading count={8} variant='list' />;
  }

  if (error) {
    return (
      <DataError message='Failed to load trades' onRetry={() => refetch()} />
    );
  }

  const trades = data?.trades as Trade[] | undefined;

  if (!trades?.length) {
    return (
      <DataEmpty
        title='No whale trades yet'
        description='Whale trades ($500+) will appear here in real-time.'
      />
    );
  }

  return (
    <div className='space-y-2'>
      {trades.map((trade, index) => (
        <TradeRow
          key={trade._id}
          trade={trade}
          index={index}
          onClick={() => onTradeSelect?.(trade.slug)}
        />
      ))}
    </div>
  );
}

interface TradeRowProps {
  trade: Trade;
  index: number;
  onClick?: () => void;
}

function TradeRow({ trade, index, onClick }: TradeRowProps) {
  const isBuy = trade.side === 'BUY';
  const isYes = trade.outcome === 'Yes' || trade.outcomeIndex === 0;

  // Determine action: BUY YES = bullish green, BUY NO = bearish red
  // SELL YES = bearish, SELL NO = bullish
  const isBullish = (isBuy && isYes) || (!isBuy && !isYes);

  return (
    <div
      onClick={onClick}
      className='group relative flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer'
      style={{
        animationDelay: `${index * 50}ms`,
        animation: 'fadeInUp 0.4s ease-out forwards',
        opacity: 0,
      }}
    >
      {/* Direction indicator */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
          isBullish
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <HugeiconsIcon
          icon={isBullish ? ArrowUp01Icon : ArrowDown01Icon}
          size={20}
          className={isBullish ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* Trade details */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 mb-1'>
          <span className='font-medium text-white truncate'>{trade.title}</span>
          {trade.signalId && (
            <Badge className='text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 border'>
              SIGNAL
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          <span className='flex items-center gap-1'>
            <HugeiconsIcon icon={UserIcon} size={12} />
            {trade.traderPseudonym || shortenAddress(trade.proxyWallet)}
          </span>
          <span className='flex items-center gap-1'>
            <HugeiconsIcon icon={Clock01Icon} size={12} />
            {formatTimeAgo(trade.timestamp * 1000)}
          </span>
        </div>
      </div>

      {/* Trade action & size */}
      <div className='flex items-center gap-3'>
        <div className='text-right'>
          <div
            className={`text-sm font-semibold ${
              isBullish ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isBuy ? 'BUY' : 'SELL'} {trade.outcome}
          </div>
          <div className='text-xs text-muted-foreground'>
            @ {(trade.price * 100).toFixed(0)}%
          </div>
        </div>

        <div className='text-right min-w-[80px]'>
          <div className='text-lg font-bold text-white tabular-nums'>
            {formatUSD(trade.size)}
          </div>
          {trade.isWhale && (
            <Badge className='text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30 border'>
              WHALE
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatUSD(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
