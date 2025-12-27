# Plan 4: Frontend Real-Time Signal Feed & Cards

## Overview

Build the core frontend experience: a real-time feed of AI signals displayed as rich, interactive cards. This includes the signal card component, live subscription to new signals, and the main signals page.

## Problem Statement / Motivation

Users need a way to:

- See AI signals in real-time as whale trades trigger analysis
- Understand each signal at a glance (decision, confidence, trade details)
- Quickly navigate to trade on Polymarket
- View signal history with pagination

The existing Insights page shows scheduled analysis results but lacks the whale-trade context and real-time feel.

## Proposed Solution

Create a new "Signals" section in the dashboard with:

1. **SignalCard component** - Rich card displaying signal details
2. **SignalFeed component** - Real-time updating list with Convex subscription
3. **Signals page** - Main route with feed and filters

## Technical Approach

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      /dashboard/signals                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     SignalsHeader                         │   │
│  │  [Live Feed Status] [Filter Toggles] [Search]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      SignalFeed                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ SignalCard                                           │ │   │
│  │  │ ┌───────┐ Market Title                              │ │   │
│  │  │ │ YES   │ $50k+ Whale • 2m ago                     │ │   │
│  │  │ │ 85%   │ High confidence • 85% consensus          │ │   │
│  │  │ └───────┘ "Claude: Strong edge..." [Trade →]       │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │ SignalCard                                           │ │   │
│  │  │ ...                                                  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                      [Load More]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create

| File                                                                   | Purpose                  |
| ---------------------------------------------------------------------- | ------------------------ |
| `apps/web/src/routes/dashboard/signals/index.tsx`                      | Signals page route       |
| `apps/web/src/routes/dashboard/signals/-components/signal-card.tsx`    | Signal card component    |
| `apps/web/src/routes/dashboard/signals/-components/signal-feed.tsx`    | Real-time feed container |
| `apps/web/src/routes/dashboard/signals/-components/signal-filters.tsx` | Filter controls          |
| `apps/web/src/routes/dashboard/-components/app-sidebar.tsx`            | Add Signals nav item     |

### Signal Card Component

```tsx
// apps/web/src/routes/dashboard/signals/-components/signal-card.tsx

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "@hugeicons/core-free-icons";
import type { Doc } from "backend/convex/_generated/dataModel";

interface SignalCardProps {
  signal: Doc<"signals"> & {
    market: {
      _id: string;
      title: string;
      eventSlug: string;
      currentYesPrice: number;
      outcome?: "YES" | "NO" | null;
    } | null;
  };
  onExpand?: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatTradeSize(size: number): string {
  if (size >= 100000) return "$100k+ Whale";
  if (size >= 50000) return "$50k+ Whale";
  if (size >= 10000) return "$10k+ Trade";
  if (size >= 5000) return "$5k+ Trade";
  if (size >= 1000) return "$1k+ Trade";
  return `$${Math.round(size)}`;
}

export function SignalCard({ signal, onExpand }: SignalCardProps) {
  const decisionConfig = {
    YES: {
      icon: ArrowUp01Icon,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      label: "YES",
    },
    NO: {
      icon: ArrowDown01Icon,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      label: "NO",
    },
    NO_TRADE: {
      icon: MinusSignIcon,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      label: "NO TRADE",
    },
  };

  const config = decisionConfig[signal.consensusDecision];

  const confidenceBadgeVariant = {
    high: "default" as const,
    medium: "secondary" as const,
    low: "outline" as const,
  };

  // Determine outcome status
  const outcomeStatus = signal.market?.outcome
    ? signal.consensusDecision === signal.market.outcome
      ? "correct"
      : "incorrect"
    : null;

  const polymarketUrl = signal.market
    ? `https://polymarket.com/event/${signal.market.eventSlug}`
    : null;

  return (
    <Card
      className={`border-sidebar-border bg-sidebar/50 overflow-hidden transition-all hover:bg-sidebar/70 cursor-pointer group ${
        outcomeStatus === "correct"
          ? "ring-1 ring-emerald-500/30"
          : outcomeStatus === "incorrect"
            ? "ring-1 ring-red-500/30"
            : ""
      }`}
      onClick={onExpand}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {/* Decision indicator */}
          <div
            className={`flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-xl ${config.bgColor} ${config.borderColor} border`}
          >
            <HugeiconsIcon icon={config.icon} size={24} className={config.color} />
            <span className={`text-xs font-bold mt-1 ${config.color}`}>
              {config.label}
            </span>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium leading-tight line-clamp-2 group-hover:text-foreground/90">
              {signal.market?.title ?? "Unknown Market"}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Trade size badge */}
              <Badge variant="outline" className="bg-background/50 text-xs">
                {formatTradeSize(signal.triggerTrade.size)}
                {signal.triggerTrade.side === "YES" ? " ↑" : " ↓"}
              </Badge>

              {/* Confidence badge */}
              <Badge
                variant={confidenceBadgeVariant[signal.confidenceLevel]}
                className="text-xs"
              >
                {signal.confidenceLevel}
              </Badge>

              {/* Consensus percentage */}
              <span className="text-xs text-muted-foreground">
                {signal.consensusPercentage.toFixed(0)}% consensus
              </span>

              {/* Time ago */}
              <span className="text-xs text-muted-foreground">
                • {formatTimeAgo(signal.signalTimestamp)}
              </span>
            </div>
          </div>

          {/* Outcome indicator (if resolved) */}
          {outcomeStatus && (
            <div
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${
                outcomeStatus === "correct"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              <HugeiconsIcon
                icon={outcomeStatus === "correct" ? CheckCircleIcon : AlertCircleIcon}
                size={18}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Price info */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">At trigger:</span>
            <span className="text-sm font-medium">
              {(signal.priceAtTrigger * 100).toFixed(0)}%
            </span>
          </div>
          {signal.market && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Current:</span>
              <span className="text-sm font-medium">
                {(signal.market.currentYesPrice * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {signal.market?.outcome && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Outcome:</span>
              <span
                className={`text-sm font-medium ${
                  signal.market.outcome === "YES"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {signal.market.outcome}
              </span>
            </div>
          )}
        </div>

        {/* Progress bar for YES price */}
        <div className="mb-3">
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 transition-all"
              style={{
                width: `${(signal.market?.currentYesPrice ?? signal.priceAtTrigger) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Reasoning preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {signal.aggregatedReasoning}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {polymarketUrl && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(polymarketUrl, "_blank");
              }}
            >
              Trade on Polymarket
              <HugeiconsIcon icon={ExternalLinkIcon} size={14} className="ml-1" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.();
            }}
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Signal Feed Component

```tsx
// apps/web/src/routes/dashboard/signals/-components/signal-feed.tsx

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { SignalCard } from "./signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wifi01Icon, WifiOff01Icon, RefreshIcon } from "@hugeicons/core-free-icons";

interface SignalFeedProps {
  onSelectSignal?: (signalId: string) => void;
  filters?: {
    onlyHighConfidence?: boolean;
    decision?: "YES" | "NO" | "NO_TRADE";
  };
}

export function SignalFeed({ onSelectSignal, filters }: SignalFeedProps) {
  const [visibleCount, setVisibleCount] = useState(20);
  const prevSignalCountRef = useRef(0);
  const [hasNewSignals, setHasNewSignals] = useState(false);

  // Real-time subscription via Convex + React Query
  const { data: signalsResponse, isLoading, isError, refetch } = useQuery(
    convexQuery(api.signals.getSignalsWithPagination, {
      limit: visibleCount,
      onlyHighConfidence: filters?.onlyHighConfidence,
      decision: filters?.decision,
    })
  );

  // Track new signals arriving
  useEffect(() => {
    if (signalsResponse?.items) {
      const currentCount = signalsResponse.items.length;
      if (prevSignalCountRef.current > 0 && currentCount > prevSignalCountRef.current) {
        setHasNewSignals(true);
        // Auto-dismiss after 5 seconds
        setTimeout(() => setHasNewSignals(false), 5000);
      }
      prevSignalCountRef.current = currentCount;
    }
  }, [signalsResponse?.items]);

  const signals = signalsResponse?.items ?? [];
  const hasMore = signalsResponse?.hasMore ?? false;

  if (isLoading) {
    return <SignalFeedSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <HugeiconsIcon
          icon={WifiOff01Icon}
          size={48}
          className="text-muted-foreground mb-4"
        />
        <p className="text-muted-foreground mb-4">
          Failed to load signals. Please try again.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <HugeiconsIcon icon={RefreshIcon} size={16} className="mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-sidebar/50 flex items-center justify-center mb-4">
          <HugeiconsIcon icon={Wifi01Icon} size={32} className="text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-2">No signals yet</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          AI signals will appear here when whale trades trigger analysis.
          Make sure the trade processor is running.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New signal notification */}
      {hasNewSignals && (
        <div
          className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 flex items-center justify-between animate-pulse"
          onClick={() => {
            setHasNewSignals(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="text-sm text-cyan-400 font-medium">
            New signal arrived!
          </span>
          <Button variant="ghost" size="sm" className="text-cyan-400">
            View
          </Button>
        </div>
      )}

      {/* Signal cards */}
      {signals.map((signal) => (
        <SignalCard
          key={signal._id}
          signal={signal}
          onExpand={() => onSelectSignal?.(signal._id)}
        />
      ))}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((prev) => prev + 20)}
          >
            Load more signals
          </Button>
        </div>
      )}
    </div>
  );
}

function SignalFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="border border-sidebar-border bg-sidebar/50 rounded-xl p-4"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Signal Filters Component

```tsx
// apps/web/src/routes/dashboard/signals/-components/signal-filters.tsx

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FilterIcon,
  SortingAZ01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

interface SignalFiltersProps {
  filters: {
    onlyHighConfidence: boolean;
    decision: "YES" | "NO" | "NO_TRADE" | "all";
    sortBy: "timestamp" | "confidence" | "tradeSize";
    searchQuery: string;
  };
  onFiltersChange: (filters: SignalFiltersProps["filters"]) => void;
  signalCounts?: {
    total: number;
    highConfidence: number;
    yes: number;
    no: number;
  };
}

export function SignalFilters({
  filters,
  onFiltersChange,
  signalCounts,
}: SignalFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search markets..."
          value={filters.searchQuery}
          onChange={(e) =>
            onFiltersChange({ ...filters, searchQuery: e.target.value })
          }
          className="pl-9"
        />
      </div>

      {/* Quick filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={filters.onlyHighConfidence ? "default" : "outline"}
          size="sm"
          onClick={() =>
            onFiltersChange({
              ...filters,
              onlyHighConfidence: !filters.onlyHighConfidence,
            })
          }
        >
          High Confidence
          {signalCounts?.highConfidence !== undefined && (
            <Badge variant="secondary" className="ml-2 px-1.5">
              {signalCounts.highConfidence}
            </Badge>
          )}
        </Button>
      </div>

      {/* Decision filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={FilterIcon} size={16} className="mr-2" />
              {filters.decision === "all"
                ? "All Decisions"
                : filters.decision}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={filters.decision}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                decision: value as typeof filters.decision,
              })
            }
          >
            <DropdownMenuRadioItem value="all">
              All Decisions
              {signalCounts?.total !== undefined && (
                <Badge variant="outline" className="ml-auto">
                  {signalCounts.total}
                </Badge>
              )}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="YES">
              YES Only
              {signalCounts?.yes !== undefined && (
                <Badge variant="outline" className="ml-auto text-emerald-400">
                  {signalCounts.yes}
                </Badge>
              )}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="NO">
              NO Only
              {signalCounts?.no !== undefined && (
                <Badge variant="outline" className="ml-auto text-red-400">
                  {signalCounts.no}
                </Badge>
              )}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="NO_TRADE">
              NO_TRADE Only
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <HugeiconsIcon icon={SortingAZ01Icon} size={16} className="mr-2" />
              Sort
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={filters.sortBy}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                sortBy: value as typeof filters.sortBy,
              })
            }
          >
            <DropdownMenuRadioItem value="timestamp">
              Most Recent
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="confidence">
              Highest Confidence
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="tradeSize">
              Largest Trade
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

### Signals Page Route

```tsx
// apps/web/src/routes/dashboard/signals/index.tsx

import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "backend/convex/_generated/api";
import { useState } from "react";
import { SignalFeed } from "./-components/signal-feed";
import { SignalFilters } from "./-components/signal-filters";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { Wifi01Icon, WifiOff01Icon } from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/signals/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.signals.getLatestSignals, { limit: 20 })
    );
  },
  component: SignalsPage,
});

function SignalsPage() {
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    onlyHighConfidence: false,
    decision: "all" as "YES" | "NO" | "NO_TRADE" | "all",
    sortBy: "timestamp" as "timestamp" | "confidence" | "tradeSize",
    searchQuery: "",
  });

  // Get signal counts for filter badges
  const { data: stats } = useQuery(
    convexQuery(api.performanceMetrics.getPerformanceStats, {})
  );

  // Connection status (check if we have recent data)
  const { data: latestSignal } = useQuery(
    convexQuery(api.signals.getLatestSignals, { limit: 1 })
  );

  const isLive =
    latestSignal &&
    latestSignal.length > 0 &&
    Date.now() - latestSignal[0].signalTimestamp < 5 * 60 * 1000; // Within 5 minutes

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Signals</h1>
            <Badge
              variant={isLive ? "default" : "outline"}
              className={`flex items-center gap-1 ${
                isLive
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "text-muted-foreground"
              }`}
            >
              <HugeiconsIcon
                icon={isLive ? Wifi01Icon : WifiOff01Icon}
                size={12}
              />
              {isLive ? "Live" : "Offline"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time AI signals triggered by whale trades on Polymarket.
          </p>
        </div>
      </div>

      {/* Filters */}
      <SignalFilters
        filters={filters}
        onFiltersChange={setFilters}
        signalCounts={
          stats
            ? {
                total: stats.totalSignals,
                highConfidence: stats.highConfidenceSignals,
                yes: stats.yesSignals,
                no: stats.noSignals,
              }
            : undefined
        }
      />

      {/* Signal Feed */}
      <SignalFeed
        onSelectSignal={setSelectedSignalId}
        filters={{
          onlyHighConfidence: filters.onlyHighConfidence,
          decision: filters.decision === "all" ? undefined : filters.decision,
        }}
      />

      {/* TODO: Signal detail modal (Plan 5) */}
    </div>
  );
}
```

### Update Sidebar Navigation

```tsx
// apps/web/src/routes/dashboard/-components/app-sidebar.tsx
// Add to navItems array:

import {
  // ... existing imports
  Notification01Icon,  // or similar signal icon
} from "@hugeicons/core-free-icons";

const navItems = [
  {
    title: "Markets",
    href: "/dashboard/markets",
    icon: ChartLineData01Icon,
  },
  {
    title: "Signals",  // NEW
    href: "/dashboard/signals",
    icon: Notification01Icon,  // Or use SparklesIcon, BellIcon, etc.
  },
  {
    title: "Insights",
    href: "/dashboard/insights",
    icon: SparklesIcon,
  },
  {
    title: "Watchlist",
    href: "/dashboard/watchlist",
    icon: StarIcon,
  },
];
```

## Acceptance Criteria

### Functional Requirements

- [ ] Signals page accessible at `/dashboard/signals`
- [ ] SignalCard displays all required information
- [ ] Trade size badge shows correct tier ($100k+, $50k+, etc.)
- [ ] Time ago updates reactively
- [ ] "Trade on Polymarket" button opens correct URL
- [ ] High confidence filter works
- [ ] Decision type filter works
- [ ] Search filters by market title (client-side)
- [ ] Load more pagination works
- [ ] Real-time updates show new signal notification

### Non-Functional Requirements

- [ ] Page loads in < 1 second
- [ ] Skeleton loaders show during initial load
- [ ] Smooth scroll and animations
- [ ] Responsive on mobile (stacked cards)

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] Components render without console errors
- [ ] Accessible (keyboard navigation, ARIA labels)

## Implementation Steps

1. **Create signal-card.tsx** - Card component with all UI elements
2. **Create signal-feed.tsx** - Feed container with Convex subscription
3. **Create signal-filters.tsx** - Filter controls
4. **Create signals page route** - Main page at `/dashboard/signals`
5. **Update sidebar** - Add Signals navigation item
6. **Test with real data** - Verify all interactions work

## Dependencies

- Plan 1: signals table must exist
- Plan 3: performanceMetrics queries for filter counts

## Risk Analysis

| Risk                      | Likelihood | Impact | Mitigation                    |
| ------------------------- | ---------- | ------ | ----------------------------- |
| UI jank with many signals | Medium     | Medium | Virtual list for 100+ signals |
| Convex subscription lag   | Low        | Low    | Show "live" status indicator  |
| Mobile layout issues      | Medium     | Low    | Test on multiple screen sizes |

## References

### Internal References

- Existing InsightCard: `apps/web/src/routes/dashboard/insights/index.tsx:107-189`
- StatsCards pattern: `apps/web/src/routes/dashboard/-components/stats-cards.tsx`
- DataTable pattern: `apps/web/src/routes/dashboard/-components/data-table.tsx`

### External References

- shadcn/ui Card: https://ui.shadcn.com/docs/components/card
- Convex React Query: https://docs.convex.dev/client/react-query
- TanStack Router: https://tanstack.com/router/latest
