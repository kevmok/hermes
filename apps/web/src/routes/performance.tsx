import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  ChartLineData01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Loading03Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/performance")({
  component: PublicPerformancePage,
});

function PublicPerformancePage() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {}),
  );

  const { data: categoryStats } = useQuery(
    convexQuery(api.performanceMetrics.getCategoryAccuracy, {}),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xl font-bold text-primary">H</span>
            </div>
            <span className="text-2xl font-semibold">Hermes</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Signal Performance
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transparent track record of our AI consensus signals. Real results,
            no cherry-picking.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={32}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                subtitle="on resolved markets"
                icon={Award01Icon}
                iconColor="text-green-500"
              />
              <StatCard
                title="Total Signals"
                value={stats.totalSignals.toLocaleString()}
                subtitle="all time"
                icon={ChartLineData01Icon}
                iconColor="text-primary"
              />
              <StatCard
                title="Correct"
                value={stats.correctPredictions.toLocaleString()}
                subtitle="predictions"
                icon={CheckmarkCircle01Icon}
                iconColor="text-green-500"
              />
              <StatCard
                title="Incorrect"
                value={stats.incorrectPredictions.toLocaleString()}
                subtitle="predictions"
                icon={Cancel01Icon}
                iconColor="text-red-500"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Signal Distribution</h3>
                  <div className="space-y-3">
                    <DistributionBar
                      label="YES Signals"
                      value={stats.yesSignals}
                      total={stats.totalSignals}
                      color="bg-green-500"
                    />
                    <DistributionBar
                      label="NO Signals"
                      value={stats.noSignals}
                      total={stats.totalSignals}
                      color="bg-red-500"
                    />
                    <DistributionBar
                      label="NO_TRADE"
                      value={stats.noTradeSignals}
                      total={stats.totalSignals}
                      color="bg-amber-500"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">
                    High Confidence Signals
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <div className="text-3xl font-bold text-primary">
                        {stats.highConfidenceWinRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Win rate on 80%+ consensus
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">
                        {stats.highConfidenceSignals}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        High confidence signals
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Avg consensus on wins
                      </span>
                      <span className="font-medium">
                        {stats.avgConsensusOnWins.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {categoryStats && categoryStats.length > 0 && (
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Accuracy by Category</h3>
                  <div className="space-y-3">
                    {categoryStats.slice(0, 6).map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="capitalize font-medium">
                            {cat.category}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({cat.total} signals)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${cat.winRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm w-12 text-right">
                            {cat.winRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="text-3xl font-bold">
                    {stats.signalsLast24h}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Signals in last 24 hours
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-3xl font-bold">
                    {stats.signalsLast7d}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Signals in last 7 days
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No performance data available yet
          </div>
        )}

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Want real-time signals and deep dive analysis?
          </p>
          <Link to="/">
            <Button size="lg">
              Get Started
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={18}
                className="ml-2"
              />
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            All performance metrics are calculated from actual signal outcomes.
            Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-muted-foreground",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <HugeiconsIcon icon={icon} size={24} className={iconColor} />
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
