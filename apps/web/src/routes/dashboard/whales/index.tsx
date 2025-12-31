import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserMultiple02Icon,
  Loading03Icon,
  CheckmarkCircle01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Dollar01Icon,
  ChartLineData01Icon,
} from '@hugeicons/core-free-icons';

export const Route = createFileRoute('/dashboard/whales/')({
  component: WhalesPage,
});

function WhalesPage() {
  const { data: whaleStats, isLoading: loadingStats } = useQuery(
    convexQuery(api.whales.getWhaleStats, {}),
  );

  const { data: smartMoneyWhales, isLoading: loadingWhales } = useQuery(
    convexQuery(api.whales.getSmartMoneyWhales, { limit: 20 }),
  );

  const { data: topWhales } = useQuery(
    convexQuery(api.whales.getTopWhalesByVolume, { limit: 20 }),
  );

  const { data: recentTrades, isLoading: loadingTrades } = useQuery(
    convexQuery(api.whales.getRecentSmartMoneyTrades, { limit: 10 }),
  );

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Whale Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track smart money traders and their performance
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {loadingStats ? (
          <div className="flex justify-center py-8">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : (
          whaleStats && <StatsGrid stats={whaleStats} />
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="p-4 border-b border-border">
              <h2 className="font-medium flex items-center gap-2">
                <HugeiconsIcon
                  icon={CheckmarkCircle01Icon}
                  size={18}
                  className="text-green-500"
                />
                Smart Money Traders
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                60%+ win rate with 10+ resolved trades
              </p>
            </div>
            <CardContent className="p-0">
              {loadingWhales ? (
                <div className="flex justify-center py-8">
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={20}
                    className="animate-spin text-muted-foreground"
                  />
                </div>
              ) : smartMoneyWhales && smartMoneyWhales.length > 0 ? (
                <div className="divide-y divide-border">
                  {smartMoneyWhales.map((whale) => (
                    <WhaleRow key={whale._id} whale={whale} showWinRate />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No smart money traders identified yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="p-4 border-b border-border">
              <h2 className="font-medium flex items-center gap-2">
                <HugeiconsIcon
                  icon={Dollar01Icon}
                  size={18}
                  className="text-primary"
                />
                Top Whales by Volume
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Highest total trading volume
              </p>
            </div>
            <CardContent className="p-0">
              {topWhales && topWhales.length > 0 ? (
                <div className="divide-y divide-border">
                  {topWhales.map((whale) => (
                    <WhaleRow key={whale._id} whale={whale} showVolume />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No whale data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <h2 className="font-medium flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData01Icon} size={18} />
              Recent Smart Money Trades
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Last 24 hours of trades from verified smart money
            </p>
          </div>
          <CardContent className="p-0">
            {loadingTrades ? (
              <div className="flex justify-center py-8">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  size={20}
                  className="animate-spin text-muted-foreground"
                />
              </div>
            ) : recentTrades && recentTrades.length > 0 ? (
              <div className="divide-y divide-border">
                {recentTrades.map((trade: any) => (
                  <SmartMoneyTradeRow key={trade._id} trade={trade} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent smart money trades
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsGrid({
  stats,
}: {
  stats: {
    totalWhales: number;
    smartMoneyCount: number;
    totalVolume: number;
    avgSmartMoneyWinRate: number;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Whales"
        value={stats.totalWhales.toLocaleString()}
        icon={UserMultiple02Icon}
      />
      <StatCard
        title="Smart Money"
        value={stats.smartMoneyCount.toLocaleString()}
        icon={CheckmarkCircle01Icon}
        iconColor="text-green-500"
      />
      <StatCard
        title="Total Volume"
        value={`$${(stats.totalVolume / 1_000_000).toFixed(2)}M`}
        icon={Dollar01Icon}
        iconColor="text-primary"
      />
      <StatCard
        title="Avg Win Rate"
        value={`${stats.avgSmartMoneyWinRate.toFixed(1)}%`}
        icon={ChartLineData01Icon}
        iconColor="text-blue-500"
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconColor = 'text-muted-foreground',
}: {
  title: string;
  value: string;
  icon: any;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <HugeiconsIcon icon={icon} size={24} className={iconColor} />
        </div>
      </CardContent>
    </Card>
  );
}

interface WhaleProfile {
  _id: string;
  address: string;
  totalTrades: number;
  totalVolume: number;
  avgTradeSize: number;
  winRate?: number;
  isSmartMoney: boolean;
  preferredCategories: string[];
  username?: string;
}

function WhaleRow({
  whale,
  showWinRate = false,
  showVolume = false,
}: {
  whale: WhaleProfile;
  showWinRate?: boolean;
  showVolume?: boolean;
}) {
  const displayName =
    whale.username ||
    `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`;

  return (
    <div className="p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={UserMultiple02Icon} size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-sm truncate">{displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {whale.totalTrades} trades
            </span>
            {whale.preferredCategories.length > 0 && (
              <Badge variant="outline" className="text-[10px] py-0">
                {whale.preferredCategories[0]}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        {showWinRate && whale.winRate !== undefined && (
          <p className="font-medium text-green-600 dark:text-green-400">
            {whale.winRate.toFixed(1)}%
          </p>
        )}
        {showVolume && (
          <p className="font-medium">
            ${(whale.totalVolume / 1000).toFixed(0)}K
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          ${whale.avgTradeSize.toFixed(0)} avg
        </p>
      </div>
    </div>
  );
}

function SmartMoneyTradeRow({ trade }: { trade: any }) {
  const isYes = trade.outcome?.toUpperCase() === 'YES';
  const isBuy = trade.side === 'BUY';

  return (
    <div className="p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{trade.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={isBuy ? 'default' : 'secondary'}
            className="text-[10px]"
          >
            {trade.side} {trade.outcome}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ${trade.size.toLocaleString()}
          </span>
          {trade.whaleProfile?.winRate && (
            <span className="text-xs text-green-600 dark:text-green-400">
              {trade.whaleProfile.winRate.toFixed(0)}% WR
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <HugeiconsIcon
          icon={isYes ? ArrowUp01Icon : ArrowDown01Icon}
          size={16}
          className={isYes ? 'text-green-500' : 'text-red-500'}
        />
        <span className="font-mono text-sm">
          {(trade.price * 100).toFixed(0)}¢
        </span>
      </div>
    </div>
  );
}
