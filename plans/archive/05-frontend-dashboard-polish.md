# Plan 5: Frontend Dashboard Polish & Advanced Features

## Overview

Complete the frontend experience with:

1. **Performance Metrics Dashboard Header** - Real-time stats display
2. **Signal Detail Modal** - Full breakdown with model predictions
3. **Signal History Log** - Paginated history with outcome tracking
4. **Notifications Bell** - Unread signal count and mini-previews
5. **Global Filter Controls** - Admin-defined preset toggles
6. **Visual polish** - Dark mode, responsive design, animations

## Problem Statement / Motivation

With signals flowing and basic display complete, users need:

- At-a-glance performance metrics (win rate, ROI, etc.)
- Detailed view of individual signals with all model predictions
- History view to track past performance
- Notification system for new signals
- Professional polish and responsive design

## Proposed Solution

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard Shell                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PerformanceHeader                      │   │
│  │  [Win Rate: 68%] [Signals: 142] [ROI: +12.3%] [24h: 8]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────────────────────────────┐ ┌────────────┐ │
│  │              SignalFeed/History             │ │ [🔔 12]    │ │
│  │              (from Plan 4)                  │ │            │ │
│  └────────────────────────────────────────────┘ └────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SignalDetailModal                      │   │
│  │  Market Title                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ Model Predictions                                    │ │   │
│  │  │ Claude: YES (78%) • GPT-4o: YES (82%) • Gemini: NO  │ │   │
│  │  └──────────────────────────────────────────────────────┘ │   │
│  │  Trade Details • Price Chart • Full Reasoning            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create/Modify

| File                                                                        | Purpose                    |
| --------------------------------------------------------------------------- | -------------------------- |
| `apps/web/src/routes/dashboard/-components/performance-header.tsx`          | Stats header component     |
| `apps/web/src/routes/dashboard/signals/-components/signal-detail-modal.tsx` | Full signal view modal     |
| `apps/web/src/routes/dashboard/signals/history.tsx`                         | Signal history page        |
| `apps/web/src/routes/dashboard/-components/notifications-bell.tsx`          | Notification dropdown      |
| `apps/web/src/routes/dashboard/-components/filter-presets.tsx`              | Global filter controls     |
| `apps/web/src/routes/dashboard/route.tsx`                                   | Add header to layout       |
| `packages/backend/convex/schema.ts`                                         | Add user lastSeenTimestamp |
| `packages/backend/convex/users.ts`                                          | User notification tracking |

## Technical Approach

### 1. Performance Header Component

```tsx
// apps/web/src/routes/dashboard/-components/performance-header.tsx

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TrophyIcon,
  ChartLineData01Icon,
  Dollar01Icon,
  Clock01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

export function PerformanceHeader() {
  const { data: stats, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {})
  );

  if (isLoading) {
    return <PerformanceHeaderSkeleton />;
  }

  const metrics = [
    {
      label: "Win Rate",
      value: stats ? `${stats.winRate.toFixed(1)}%` : "—",
      subtext: stats
        ? `${stats.correctPredictions}/${stats.predictionsEvaluated}`
        : "",
      icon: TrophyIcon,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      trend: stats && stats.winRate > 50 ? "up" : stats && stats.winRate < 50 ? "down" : null,
    },
    {
      label: "Total Signals",
      value: stats?.totalSignals.toLocaleString() ?? "—",
      subtext: `${stats?.highConfidenceSignals ?? 0} high confidence`,
      icon: ChartLineData01Icon,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      trend: null,
    },
    {
      label: "Simulated ROI",
      value: stats ? `${stats.simulatedROI >= 0 ? "+" : ""}${stats.simulatedROI.toFixed(1)}%` : "—",
      subtext: "Flat $100 bets",
      icon: Dollar01Icon,
      color: stats?.simulatedROI >= 0 ? "text-emerald-400" : "text-red-400",
      bgColor: stats?.simulatedROI >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
      trend: stats && stats.simulatedROI >= 0 ? "up" : stats && stats.simulatedROI < 0 ? "down" : null,
    },
    {
      label: "Last 24h",
      value: stats?.signalsLast24h.toLocaleString() ?? "—",
      subtext: `${stats?.signalsLast7d ?? 0} this week`,
      icon: Clock01Icon,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className={`${metric.bgColor} rounded-xl p-4 border border-sidebar-border/50`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              {metric.label}
            </span>
            <HugeiconsIcon
              icon={metric.icon}
              size={16}
              className={metric.color}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
            {metric.trend && (
              <HugeiconsIcon
                icon={metric.trend === "up" ? ArrowUp01Icon : ArrowDown01Icon}
                size={14}
                className={metric.trend === "up" ? "text-emerald-400" : "text-red-400"}
              />
            )}
          </div>
          {metric.subtext && (
            <span className="text-xs text-muted-foreground">{metric.subtext}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PerformanceHeaderSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-sidebar/50 rounded-xl p-4 border border-sidebar-border/50"
        >
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
```

### 2. Signal Detail Modal

```tsx
// apps/web/src/routes/dashboard/signals/-components/signal-detail-modal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  ExternalLinkIcon,
  Clock01Icon,
  Dollar01Icon,
} from "@hugeicons/core-free-icons";
import type { Id } from "backend/convex/_generated/dataModel";

interface SignalDetailModalProps {
  signalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignalDetailModal({
  signalId,
  open,
  onOpenChange,
}: SignalDetailModalProps) {
  // Fetch signal with linked predictions
  const { data: signalData, isLoading } = useQuery({
    ...convexQuery(api.signals.getSignalWithPredictions, {
      signalId: signalId as Id<"signals">,
    }),
    enabled: !!signalId && open,
  });

  if (!signalId) return null;

  const decisionConfig = {
    YES: {
      icon: ArrowUp01Icon,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    NO: {
      icon: ArrowDown01Icon,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
    },
    NO_TRADE: {
      icon: MinusSignIcon,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !signalData ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading signal details...
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl leading-tight pr-8">
                {signalData.market?.title ?? "Unknown Market"}
              </DialogTitle>
            </DialogHeader>

            {/* Consensus Decision */}
            <div className="flex items-center gap-4 py-4">
              <div
                className={`flex items-center justify-center w-20 h-20 rounded-xl ${
                  decisionConfig[signalData.consensusDecision].bgColor
                } border border-sidebar-border`}
              >
                <div className="text-center">
                  <HugeiconsIcon
                    icon={decisionConfig[signalData.consensusDecision].icon}
                    size={32}
                    className={decisionConfig[signalData.consensusDecision].color}
                  />
                  <span
                    className={`text-sm font-bold ${
                      decisionConfig[signalData.consensusDecision].color
                    }`}
                  >
                    {signalData.consensusDecision.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {signalData.consensusPercentage.toFixed(0)}% consensus
                  </Badge>
                  <Badge
                    variant={
                      signalData.confidenceLevel === "high"
                        ? "default"
                        : signalData.confidenceLevel === "medium"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {signalData.confidenceLevel} confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {signalData.agreeingModels} of {signalData.totalModels} models agreed
                </p>
              </div>
            </div>

            <Separator />

            {/* Trigger Trade Details */}
            <div className="py-4">
              <h3 className="text-sm font-semibold mb-3">Trigger Trade</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Dollar01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-sm">
                    ${signalData.triggerTrade.size.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={
                      signalData.triggerTrade.side === "YES"
                        ? ArrowUp01Icon
                        : ArrowDown01Icon
                    }
                    size={16}
                    className={
                      signalData.triggerTrade.side === "YES"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  />
                  <span className="text-sm">
                    {signalData.triggerTrade.side} at{" "}
                    {(signalData.triggerTrade.price * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-sm">
                    {new Date(signalData.triggerTrade.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Price at trigger:
                  </span>
                  <span className="text-sm font-medium">
                    {(signalData.priceAtTrigger * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Individual Model Predictions */}
            {signalData.predictions && signalData.predictions.length > 0 && (
              <div className="py-4">
                <h3 className="text-sm font-semibold mb-3">Model Predictions</h3>
                <div className="space-y-3">
                  {signalData.predictions.map((prediction) => (
                    <div
                      key={prediction._id}
                      className={`p-3 rounded-lg border ${
                        decisionConfig[prediction.decision].bgColor
                      } border-sidebar-border`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{prediction.modelName}</span>
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={decisionConfig[prediction.decision].icon}
                            size={16}
                            className={decisionConfig[prediction.decision].color}
                          />
                          <span
                            className={`font-semibold ${
                              decisionConfig[prediction.decision].color
                            }`}
                          >
                            {prediction.decision}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {prediction.reasoning}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{prediction.responseTimeMs}ms</span>
                        {prediction.confidence && (
                          <span>{prediction.confidence}% confidence</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Full Reasoning */}
            <div className="py-4">
              <h3 className="text-sm font-semibold mb-3">Aggregated Reasoning</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {signalData.aggregatedReasoning}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              {signalData.market && (
                <Button
                  className="flex-1"
                  onClick={() =>
                    window.open(
                      `https://polymarket.com/event/${signalData.market!.eventSlug}`,
                      "_blank"
                    )
                  }
                >
                  Trade on Polymarket
                  <HugeiconsIcon icon={ExternalLinkIcon} size={16} className="ml-2" />
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Backend: Signal with Predictions Query

```typescript
// packages/backend/convex/signals.ts (add to existing)

export const getSignalWithPredictions = query({
  args: { signalId: v.id('signals') },
  handler: async (ctx, args) => {
    const signal = await ctx.db.get(args.signalId);
    if (!signal) return null;

    const market = await ctx.db.get(signal.marketId);

    // Fetch linked model predictions if they exist
    // Signals may optionally link to an analysisRun
    let predictions: Doc<'modelPredictions'>[] = [];

    // Look for predictions created around the same time as the signal
    const predictionWindow = 60 * 1000; // 1 minute
    const potentialPredictions = await ctx.db
      .query('modelPredictions')
      .withIndex('by_market', (q) => q.eq('marketId', signal.marketId))
      .filter((q) =>
        q.and(
          q.gte(q.field('timestamp'), signal.signalTimestamp - predictionWindow),
          q.lte(q.field('timestamp'), signal.signalTimestamp + predictionWindow)
        )
      )
      .collect();

    predictions = potentialPredictions;

    return {
      ...signal,
      market: market
        ? {
            _id: market._id,
            title: market.title,
            eventSlug: market.eventSlug,
            currentYesPrice: market.currentYesPrice,
            outcome: market.outcome,
          }
        : null,
      predictions,
    };
  },
});
```

### 4. Notifications Bell Component

```tsx
// apps/web/src/routes/dashboard/-components/notifications-bell.tsx

import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  // Get user's last seen timestamp
  const { data: user } = useQuery(
    convexQuery(api.users.getCurrentUser, {})
  );

  // Get signals since last seen
  const { data: newSignals } = useQuery({
    ...convexQuery(api.signals.getSignalsSince, {
      since: user?.lastSeenSignalsAt ?? 0,
      limit: 10,
    }),
    enabled: !!user,
  });

  const markSeen = useConvexMutation(api.users.updateLastSeenSignals);

  const unreadCount = newSignals?.length ?? 0;

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      // Mark as seen when dropdown opens
      markSeen.mutate({});
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <HugeiconsIcon icon={Notification01Icon} size={20} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b border-sidebar-border">
          <h3 className="font-semibold">New Signals</h3>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} new signal${unreadCount > 1 ? "s" : ""}`
              : "No new signals"}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!newSignals || newSignals.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No new signals to show
            </div>
          ) : (
            newSignals.map((signal) => (
              <Link
                key={signal._id}
                to="/dashboard/signals"
                className="flex items-start gap-3 px-3 py-2 hover:bg-sidebar-accent transition-colors"
              >
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    signal.consensusDecision === "YES"
                      ? "bg-emerald-500/10"
                      : signal.consensusDecision === "NO"
                        ? "bg-red-500/10"
                        : "bg-yellow-500/10"
                  }`}
                >
                  <HugeiconsIcon
                    icon={
                      signal.consensusDecision === "YES"
                        ? ArrowUp01Icon
                        : ArrowDown01Icon
                    }
                    size={16}
                    className={
                      signal.consensusDecision === "YES"
                        ? "text-emerald-400"
                        : signal.consensusDecision === "NO"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {signal.market?.title ?? "Unknown Market"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {signal.consensusDecision} •{" "}
                    {signal.consensusPercentage.toFixed(0)}% consensus
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>

        {newSignals && newSignals.length > 0 && (
          <div className="px-3 py-2 border-t border-sidebar-border">
            <Link
              to="/dashboard/signals"
              className="text-sm text-cyan-400 hover:underline"
            >
              View all signals →
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 5. Backend: User Notification Tracking

```typescript
// packages/backend/convex/users.ts (add/create)

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get current user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();

    return user;
  },
});

export const updateLastSeenSignals = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db
      .query('user')
      .withIndex('userId', (q) => q.eq('userId', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, {
      lastSeenSignalsAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

```typescript
// packages/backend/convex/schema.ts (add to user table)

user: defineTable({
  // ... existing fields ...
  lastSeenSignalsAt: v.optional(v.number()), // NEW
})
```

```typescript
// packages/backend/convex/signals.ts (add)

export const getSignalsSince = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .filter((q) => q.gt(q.field('signalTimestamp'), args.since))
      .order('desc')
      .take(args.limit ?? 20);

    return Promise.all(
      signals.map(async (signal) => {
        const market = await ctx.db.get(signal.marketId);
        return {
          ...signal,
          market: market
            ? { _id: market._id, title: market.title }
            : null,
        };
      })
    );
  },
});
```

### 6. Update Dashboard Route Layout

```tsx
// apps/web/src/routes/dashboard/route.tsx (update)

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./-components/app-sidebar";
import { PerformanceHeader } from "./-components/performance-header";
import { NotificationsBell } from "./-components/notifications-bell";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: session.data.user };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsBell />
          </div>
        </header>

        {/* Performance stats header */}
        <div className="px-6 py-4 border-b border-sidebar-border bg-sidebar/30">
          <PerformanceHeader />
        </div>

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 7. Signal History Page

```tsx
// apps/web/src/routes/dashboard/signals/history.tsx

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { SignalCard } from "./-components/signal-card";
import { SignalFilters } from "./-components/signal-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/signals/history")({
  component: SignalHistoryPage,
});

function SignalHistoryPage() {
  const [tab, setTab] = useState<"all" | "evaluated" | "correct" | "incorrect">("all");
  const [filters, setFilters] = useState({
    onlyHighConfidence: false,
    decision: "all" as "YES" | "NO" | "NO_TRADE" | "all",
    sortBy: "timestamp" as const,
    searchQuery: "",
  });

  const { data: signalsWithOutcomes } = useQuery(
    convexQuery(api.performanceMetrics.getSignalsWithOutcomes, {
      limit: 100,
      onlyEvaluated: tab === "evaluated" || tab === "correct" || tab === "incorrect",
    })
  );

  const filteredSignals = signalsWithOutcomes?.filter((s) => {
    if (tab === "correct" && s.isCorrect !== true) return false;
    if (tab === "incorrect" && s.isCorrect !== false) return false;
    return true;
  }) ?? [];

  const counts = {
    all: signalsWithOutcomes?.length ?? 0,
    evaluated: signalsWithOutcomes?.filter((s) => s.isCorrect !== null).length ?? 0,
    correct: signalsWithOutcomes?.filter((s) => s.isCorrect === true).length ?? 0,
    incorrect: signalsWithOutcomes?.filter((s) => s.isCorrect === false).length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signal History</h1>
        <p className="text-muted-foreground mt-1">
          View past signals and track accuracy against market outcomes.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">
            All <Badge variant="secondary" className="ml-2">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="evaluated">
            Evaluated <Badge variant="secondary" className="ml-2">{counts.evaluated}</Badge>
          </TabsTrigger>
          <TabsTrigger value="correct">
            Correct <Badge variant="secondary" className="ml-2 text-emerald-400">{counts.correct}</Badge>
          </TabsTrigger>
          <TabsTrigger value="incorrect">
            Incorrect <Badge variant="secondary" className="ml-2 text-red-400">{counts.incorrect}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <SignalFilters filters={filters} onFiltersChange={setFilters} />

      <div className="space-y-4">
        {filteredSignals.map((signal) => (
          <SignalCard key={signal._id} signal={signal as any} />
        ))}
      </div>
    </div>
  );
}
```

## Acceptance Criteria

### Functional Requirements

- [ ] Performance header displays all 4 metrics correctly
- [ ] Metrics update in real-time via Convex subscription
- [ ] Signal detail modal shows all fields including model predictions
- [ ] Notifications bell shows unread count
- [ ] Unread count clears when dropdown opens
- [ ] Signal history page with outcome filtering works
- [ ] Tabs correctly filter by correct/incorrect signals

### Non-Functional Requirements

- [ ] Dashboard layout responsive on mobile
- [ ] Dark mode default, theme toggle works
- [ ] Animations smooth (60fps)
- [ ] No layout shift on data load

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] All components render without errors
- [ ] Lighthouse accessibility score > 90

## Implementation Steps

1. **Create performance-header.tsx** - Stats display component
2. **Create signal-detail-modal.tsx** - Full signal view
3. **Add backend query** - getSignalWithPredictions
4. **Create notifications-bell.tsx** - Unread indicator
5. **Add user schema field** - lastSeenSignalsAt
6. **Add backend mutations** - User notification tracking
7. **Update dashboard route** - Add header and notifications
8. **Create history page** - Signal history with outcomes
9. **Polish and test** - Responsive design, animations

## Dependencies

- Plan 1: Signals schema
- Plan 3: Performance metrics queries
- Plan 4: Signal card component

## Risk Analysis

| Risk                                    | Likelihood | Impact | Mitigation              |
| --------------------------------------- | ---------- | ------ | ----------------------- |
| Modal performance with many predictions | Low        | Medium | Limit predictions shown |
| Notification count accuracy             | Low        | Low    | Use Convex real-time    |
| Layout complexity on mobile             | Medium     | Medium | Progressive disclosure  |

## Future Considerations

- **Push notifications**: Browser/mobile push for new signals
- **Export functionality**: Download signal history as CSV
- **Custom alerts**: User-defined filters for notifications
- **Model accuracy breakdown**: Per-model win rate display

## References

### Internal References

- Existing dialog: `apps/web/src/components/ui/dialog.tsx`
- Stats cards pattern: `apps/web/src/routes/dashboard/-components/stats-cards.tsx`
- Insights page: `apps/web/src/routes/dashboard/insights/index.tsx`

### External References

- shadcn/ui Dialog: https://ui.shadcn.com/docs/components/dialog
- shadcn/ui Tabs: https://ui.shadcn.com/docs/components/tabs
- Convex Auth: https://docs.convex.dev/auth
