# Plan 3: Backend Resolution Updater & Performance Metrics

## Overview

Implement two backend systems that enable performance tracking:

1. **Resolution Updater Cron** - Automatically fetch and store market outcomes from Polymarket
2. **Performance Metrics Aggregation** - Calculate win rate, ROI, and other stats

## Problem Statement / Motivation

To measure AI signal accuracy, we need to:

- Know the actual outcome of markets (YES or NO)
- Compare AI predictions against outcomes
- Calculate aggregate performance metrics
- Display real-time stats on the dashboard

Currently, markets are tracked while active but their final resolution is never recorded.

## Proposed Solution

### Component 1: Resolution Updater Cron

A scheduled Convex function that:

1. Runs hourly (or on-demand)
2. Queries Polymarket's Gamma Markets API for resolved markets
3. Updates the `markets` table with outcomes
4. Marks markets as inactive

### Component 2: Performance Metrics Aggregation

A query system that:

1. Joins signals with resolved markets
2. Calculates accuracy per decision type
3. Computes simulated ROI
4. Returns stats for dashboard display

## Technical Approach

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   Resolution & Metrics Flow                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐    ┌─────────────────┐    ┌──────────────────┐│
│  │   Convex   │───▶│ Polymarket API  │───▶│ Update Markets   ││
│  │   Cron     │    │ (Gamma/CLOB)    │    │ with Outcomes    ││
│  │  (hourly)  │    │                 │    │                  ││
│  └────────────┘    └─────────────────┘    └──────────────────┘│
│                                                  │              │
│                                                  ▼              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                     Performance Query                       ││
│  │  signals + markets(resolved) → win_rate, ROI, counts       ││
│  └────────────────────────────────────────────────────────────┘│
│                                                  │              │
│                                                  ▼              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                    Dashboard Stats                          ││
│  │  Win Rate │ Total Signals │ Avg Confidence │ Recent Count  ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### Files to Create/Modify

| File                                            | Purpose                          |
| ----------------------------------------------- | -------------------------------- |
| `packages/backend/convex/resolution.ts`         | Resolution fetching and updating |
| `packages/backend/convex/performanceMetrics.ts` | Stats calculation queries        |
| `packages/backend/convex/crons.ts`              | Add resolution cron job          |
| `packages/backend/convex/scheduledJobs.ts`      | Resolution job implementation    |

### Resolution Module

```typescript
// packages/backend/convex/resolution.ts

import { v } from 'convex/values';
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

// Polymarket Gamma API types
interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  outcomes: string[];
  outcome_prices: string[];
  active: boolean;
  closed: boolean;
  resolved: boolean;
  resolution: string | null; // "Yes" | "No" | null
  resolution_source?: string;
  end_date_iso?: string;
}

// ============ EXTERNAL API CALL ============

export const fetchResolvedMarkets = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      conditionId: v.string(),
      outcome: v.union(v.literal('YES'), v.literal('NO'), v.null()),
      resolutionSource: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args): Promise<
    Array<{
      conditionId: string;
      outcome: 'YES' | 'NO' | null;
      resolutionSource?: string;
    }>
  > => {
    const limit = args.limit ?? 100;

    try {
      // Polymarket Gamma API endpoint for resolved markets
      const url = `https://gamma-api.polymarket.com/markets?resolved=true&limit=${limit}&order=desc&sort=end_date_iso`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Gamma API error: ${response.status}`);
        return [];
      }

      const markets: GammaMarket[] = await response.json();

      return markets
        .filter((m) => m.resolved && m.resolution)
        .map((m) => ({
          conditionId: m.condition_id,
          outcome: parseResolution(m.resolution),
          resolutionSource: m.resolution_source || 'polymarket_gamma',
        }));
    } catch (error) {
      console.error('Failed to fetch resolved markets:', error);
      return [];
    }
  },
});

function parseResolution(resolution: string | null): 'YES' | 'NO' | null {
  if (!resolution) return null;
  const upper = resolution.toUpperCase();
  if (upper === 'YES' || upper === 'TRUE' || upper === '1') return 'YES';
  if (upper === 'NO' || upper === 'FALSE' || upper === '0') return 'NO';
  return null;
}

// ============ INTERNAL MUTATIONS ============

export const updateMarketResolution = internalMutation({
  args: {
    polymarketId: v.string(),
    outcome: v.union(v.literal('YES'), v.literal('NO'), v.null()),
    resolutionSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const market = await ctx.db
      .query('markets')
      .withIndex('by_polymarket_id', (q) =>
        q.eq('polymarketId', args.polymarketId)
      )
      .first();

    if (!market) {
      console.log(`Market not found for polymarketId: ${args.polymarketId}`);
      return null;
    }

    // Skip if already resolved with same outcome
    if (market.outcome === args.outcome) {
      return market._id;
    }

    await ctx.db.patch(market._id, {
      outcome: args.outcome,
      resolvedAt: Date.now(),
      resolutionSource: args.resolutionSource,
      isActive: false,
      updatedAt: Date.now(),
    });

    console.log(`Updated market "${market.title}" with outcome: ${args.outcome}`);
    return market._id;
  },
});

// ============ SCHEDULED JOB ============

export const runResolutionUpdater = internalAction({
  args: {},
  returns: v.object({
    fetchedCount: v.number(),
    updatedCount: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx): Promise<{
    fetchedCount: number;
    updatedCount: number;
    errors: string[];
  }> => {
    const errors: string[] = [];

    // Fetch recently resolved markets from Polymarket
    const resolvedMarkets = await ctx.runAction(
      internal.resolution.fetchResolvedMarkets,
      { limit: 200 }
    );

    console.log(`Fetched ${resolvedMarkets.length} resolved markets from Polymarket`);

    let updatedCount = 0;

    for (const resolved of resolvedMarkets) {
      try {
        const result = await ctx.runMutation(
          internal.resolution.updateMarketResolution,
          {
            polymarketId: resolved.conditionId,
            outcome: resolved.outcome,
            resolutionSource: resolved.resolutionSource,
          }
        );

        if (result) {
          updatedCount++;
        }
      } catch (error) {
        errors.push(
          `Failed to update ${resolved.conditionId}: ${error}`
        );
      }
    }

    return {
      fetchedCount: resolvedMarkets.length,
      updatedCount,
      errors,
    };
  },
});

// ============ PUBLIC QUERIES ============

export const getResolutionStatus = query({
  args: {},
  handler: async (ctx) => {
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .take(1000);

    const unresolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .filter((q) => q.eq(q.field('outcome'), undefined))
      .take(1000);

    return {
      resolvedCount: resolvedMarkets.length,
      unresolvedCount: unresolvedMarkets.length,
      lastResolution: resolvedMarkets[0]?.resolvedAt ?? null,
    };
  },
});

// ============ MANUAL TRIGGER ============

export const triggerResolutionUpdate = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.resolution.runResolutionUpdater, {});
    return { scheduled: true };
  },
});
```

### Performance Metrics Module

```typescript
// packages/backend/convex/performanceMetrics.ts

import { v } from 'convex/values';
import { query, internalQuery, mutation } from './_generated/server';
import type { Doc } from './_generated/dataModel';

// ============ CORE METRICS QUERY ============

export const getPerformanceStats = query({
  args: {
    sinceDays: v.optional(v.number()), // Filter signals from last N days
  },
  handler: async (ctx, args) => {
    const sinceMs = args.sinceDays
      ? Date.now() - args.sinceDays * 24 * 60 * 60 * 1000
      : 0;

    // Get all signals (optionally filtered by time)
    const allSignals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .filter((q) =>
        sinceMs > 0 ? q.gte(q.field('signalTimestamp'), sinceMs) : q.eq(1, 1)
      )
      .collect();

    // Get all resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();

    // Create lookup map for resolved markets
    const resolvedMap = new Map<string, 'YES' | 'NO' | null>();
    for (const market of resolvedMarkets) {
      resolvedMap.set(market._id, market.outcome ?? null);
    }

    // Calculate metrics
    let totalSignals = allSignals.length;
    let signalsOnResolved = 0;
    let correctPredictions = 0;
    let incorrectPredictions = 0;
    let yesSignals = 0;
    let noSignals = 0;
    let noTradeSignals = 0;
    let highConfidenceSignals = 0;
    let highConfidenceCorrect = 0;
    let totalConsensusOnWins = 0;

    // Time-based counts
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let signalsLast24h = 0;
    let signalsLast7d = 0;

    for (const signal of allSignals) {
      // Count by decision type
      if (signal.consensusDecision === 'YES') yesSignals++;
      else if (signal.consensusDecision === 'NO') noSignals++;
      else noTradeSignals++;

      // High confidence tracking
      if (signal.isHighConfidence) {
        highConfidenceSignals++;
      }

      // Time-based counts
      if (signal.signalTimestamp >= oneDayAgo) signalsLast24h++;
      if (signal.signalTimestamp >= sevenDaysAgo) signalsLast7d++;

      // Check against resolved outcome
      const outcome = resolvedMap.get(signal.marketId);
      if (outcome !== undefined && outcome !== null) {
        signalsOnResolved++;

        // Skip NO_TRADE for accuracy calculation
        if (signal.consensusDecision === 'NO_TRADE') continue;

        const isCorrect = signal.consensusDecision === outcome;
        if (isCorrect) {
          correctPredictions++;
          totalConsensusOnWins += signal.consensusPercentage;
          if (signal.isHighConfidence) highConfidenceCorrect++;
        } else {
          incorrectPredictions++;
        }
      }
    }

    // Calculate rates
    const predictionsEvaluated = correctPredictions + incorrectPredictions;
    const winRate =
      predictionsEvaluated > 0
        ? (correctPredictions / predictionsEvaluated) * 100
        : 0;

    const highConfidenceWinRate =
      highConfidenceSignals > 0
        ? (highConfidenceCorrect / highConfidenceSignals) * 100
        : 0;

    const avgConsensusOnWins =
      correctPredictions > 0 ? totalConsensusOnWins / correctPredictions : 0;

    // Calculate simulated ROI (assuming $100 flat bet per signal)
    // Simple model: win pays 1:1, lose pays -1
    const simulatedROI = predictionsEvaluated > 0
      ? ((correctPredictions - incorrectPredictions) / predictionsEvaluated) * 100
      : 0;

    return {
      // Totals
      totalSignals,
      signalsOnResolved,
      predictionsEvaluated,

      // Accuracy
      correctPredictions,
      incorrectPredictions,
      winRate,
      highConfidenceWinRate,
      avgConsensusOnWins,

      // ROI
      simulatedROI,

      // Breakdown
      yesSignals,
      noSignals,
      noTradeSignals,
      highConfidenceSignals,

      // Recent activity
      signalsLast24h,
      signalsLast7d,
    };
  },
});

// ============ SIGNAL ACCURACY BREAKDOWN ============

export const getSignalAccuracyByDecision = query({
  args: {},
  handler: async (ctx) => {
    // Get all signals with YES or NO decisions
    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .collect();

    // Get resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();

    const resolvedMap = new Map<string, 'YES' | 'NO' | null>();
    for (const market of resolvedMarkets) {
      resolvedMap.set(market._id, market.outcome ?? null);
    }

    const breakdown = {
      YES: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
      NO: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
      NO_TRADE: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
    };

    for (const signal of signals) {
      const decision = signal.consensusDecision;
      breakdown[decision].total++;

      const outcome = resolvedMap.get(signal.marketId);
      if (outcome !== undefined && outcome !== null) {
        breakdown[decision].evaluated++;
        if (decision === outcome) {
          breakdown[decision].correct++;
        }
      }
    }

    // Calculate win rates
    for (const key of ['YES', 'NO'] as const) {
      breakdown[key].winRate =
        breakdown[key].evaluated > 0
          ? (breakdown[key].correct / breakdown[key].evaluated) * 100
          : 0;
    }

    return breakdown;
  },
});

// ============ SIGNALS WITH OUTCOMES ============

export const getSignalsWithOutcomes = query({
  args: {
    limit: v.optional(v.number()),
    onlyEvaluated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit * 2); // Fetch extra to filter

    const results = await Promise.all(
      signals.map(async (signal) => {
        const market = await ctx.db.get(signal.marketId);

        const outcome = market?.outcome ?? null;
        const isCorrect =
          outcome !== null && signal.consensusDecision !== 'NO_TRADE'
            ? signal.consensusDecision === outcome
            : null;

        return {
          ...signal,
          market: market
            ? {
                _id: market._id,
                title: market.title,
                eventSlug: market.eventSlug,
                outcome: market.outcome,
                resolvedAt: market.resolvedAt,
                currentYesPrice: market.currentYesPrice,
              }
            : null,
          outcome,
          isCorrect,
        };
      })
    );

    if (args.onlyEvaluated) {
      return results.filter((r) => r.isCorrect !== null).slice(0, limit);
    }

    return results.slice(0, limit);
  },
});

// ============ DAILY STATS HISTORY ============

export const getDailySignalStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const now = Date.now();
    const startMs = now - days * 24 * 60 * 60 * 1000;

    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .filter((q) => q.gte(q.field('signalTimestamp'), startMs))
      .collect();

    // Group by day
    const dailyStats = new Map<
      string,
      { count: number; highConfidence: number; yesDecisions: number; noDecisions: number }
    >();

    for (const signal of signals) {
      const date = new Date(signal.signalTimestamp).toISOString().split('T')[0];

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          count: 0,
          highConfidence: 0,
          yesDecisions: 0,
          noDecisions: 0,
        });
      }

      const stats = dailyStats.get(date)!;
      stats.count++;
      if (signal.isHighConfidence) stats.highConfidence++;
      if (signal.consensusDecision === 'YES') stats.yesDecisions++;
      if (signal.consensusDecision === 'NO') stats.noDecisions++;
    }

    // Convert to sorted array
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});
```

### Add Cron Job

```typescript
// packages/backend/convex/crons.ts (update existing)

import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Existing cron...
crons.interval(
  'Automatic market analysis',
  { minutes: 30 },
  internal.scheduledJobs.runAutomaticAnalysis,
);

// NEW: Resolution updater - runs every hour
crons.interval(
  'Update market resolutions',
  { hours: 1 },
  internal.resolution.runResolutionUpdater,
);

// Existing cleanup cron...
crons.daily(
  'Clean up old snapshots',
  { hourUTC: 4, minuteUTC: 0 },
  internal.scheduledJobs.cleanupOldData,
);

export default crons;
```

## Acceptance Criteria

### Functional Requirements

- [ ] Resolution updater fetches from Polymarket Gamma API
- [ ] Markets updated with correct outcome (YES/NO)
- [ ] Markets marked as inactive when resolved
- [ ] Cron job runs hourly automatically
- [ ] Manual trigger mutation works
- [ ] `getPerformanceStats` returns all required metrics
- [ ] Win rate calculated correctly (only YES/NO signals vs outcomes)
- [ ] `getSignalsWithOutcomes` shows correct/incorrect status
- [ ] Daily stats aggregation works

### Non-Functional Requirements

- [ ] API calls handle rate limiting gracefully
- [ ] Performance queries complete in < 1 second
- [ ] No N+1 query patterns in metrics calculation

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] Test with mock resolved markets data
- [ ] Verify cron registration in Convex dashboard

## Implementation Steps

1. **Create resolution.ts** - API calls and mutations
2. **Create performanceMetrics.ts** - Stats queries
3. **Update crons.ts** - Add hourly resolution job
4. **Test API integration** - Verify Gamma API works
5. **Seed test data** - Create test signals and resolve markets
6. **Verify metrics** - Check calculations are accurate

## Dependencies

- Plan 1: Signals table and market outcome fields must exist

## Risk Analysis

| Risk                     | Likelihood | Impact | Mitigation                           |
| ------------------------ | ---------- | ------ | ------------------------------------ |
| Polymarket API changes   | Low        | High   | Monitor for 4xx errors, add fallback |
| API rate limiting        | Medium     | Low    | Use hourly cron, not more frequent   |
| Outcome mapping errors   | Low        | Medium | Log unknown resolution strings       |
| Slow performance queries | Medium     | Medium | Add caching layer if needed          |

## Future Considerations

- **Stats caching**: Store computed stats in a singleton table, update on cron
- **Per-model accuracy**: Track which AI models are most accurate
- **Category breakdown**: Show win rate by market category
- **Confidence calibration**: Are 80%+ signals actually 80% accurate?

## References

### Internal References

- Markets schema: `packages/backend/convex/schema.ts:71-96`
- Crons pattern: `packages/backend/convex/crons.ts`
- Insights queries: `packages/backend/convex/insights.ts`

### External References

- Polymarket Gamma API: https://docs.polymarket.com
- Convex cron jobs: https://docs.convex.dev/scheduling/cron-jobs
