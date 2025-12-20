# Fix Convex Integration: Use Official ConvexHttpClient

**Type:** refactor/fix
**Priority:** High
**Created:** 2025-01-20

## Overview

The lofn collector has a `ConvexDataService` that uses a custom `fetch()` implementation instead of the official `ConvexHttpClient` from `"convex/browser"`. Additionally, the WebSocketService only stores trades to local CSV files - it never sends data to Convex. This plan fixes both issues to enable the real-time trading analytics SaaS dashboard.

## Problem Statement

### Current State

1. **Custom fetch instead of official client**: `apps/lofn/src/services/data/ConvexDataService.ts:12-35` uses raw `fetch()` calls
2. **ConvexDataService not integrated**: Defined but never added to `AppLayers` or used anywhere
3. **No Convex data flow**: `WebSocketService.ts` processes trades but only updates local Polars DataFrames and CSVs
4. **Dashboard has no data**: The Convex backend has AI analysis ready, but receives no market data

### Desired State

- Use official `ConvexHttpClient` with proper error handling and mutation queuing
- WebSocket trades flow to Convex in real-time
- Convex auto-triggers AI analysis on market upsert
- Dashboard subscribers receive reactive updates

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         lofn Collector (Bun)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Polymarket WebSocket ──► WebSocketService ──► ConvexDataService   │
│         │                       │                     │             │
│         │                       │                     ▼             │
│         │                       │            ConvexHttpClient       │
│         │                       │                     │             │
│         │                       ▼                     │             │
│         │               DataService (CSV)             │             │
│         │                       │                     │             │
└─────────│───────────────────────│─────────────────────│─────────────┘
          │                       │                     │
          │                       ▼                     ▼
          │              ./data/polymarket/    Convex Cloud Backend
          │              (backup CSVs)                  │
          │                                             ▼
          │                                    ┌───────────────────┐
          │                                    │ markets table     │
          │                                    │ (auto-analysis)   │
          │                                    └────────┬──────────┘
          │                                             │
          │                                             ▼
          │                                    ┌───────────────────┐
          │                                    │ analyzeMarket     │
          │                                    │ WithSwarm         │
          │                                    └────────┬──────────┘
          │                                             │
          │                                             ▼
          │                                    ┌───────────────────┐
          │                                    │ insights table    │
          │                                    └────────┬──────────┘
          │                                             │
          └──────────────────────────────────────────── │ ───────────►
                                                        │
                                                        ▼
                                               ┌───────────────────┐
                                               │   SaaS Dashboard  │
                                               │  (React + Convex) │
                                               └───────────────────┘
```

### Implementation Phases

#### Phase 1: Replace Custom Fetch with ConvexHttpClient

**File:** `apps/lofn/src/services/data/ConvexDataService.ts`

**Changes:**

1. Import `ConvexHttpClient` from `"convex/browser"`
2. Import generated API types from `"backend/convex/_generated/api"`
3. Create singleton client instance in Layer.effect
4. Replace all `convexFetch()` calls with `client.mutation()` / `client.query()`
5. Add Effect.retry with exponential backoff for resilience

```typescript
// apps/lofn/src/services/data/ConvexDataService.ts
import { Context, Effect, Layer, Schedule, Duration } from 'effect';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'backend/convex/_generated/api';
import type { Id } from 'backend/convex/_generated/dataModel';

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error('CONVEX_URL environment variable is required');
}

export interface MarketData {
  polymarketId: string;
  conditionId?: string;
  eventSlug: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
  totalVolume: number;
  isActive: boolean;
  endDate?: number;
}

export class ConvexDataService extends Context.Tag('ConvexDataService')<
  ConvexDataService,
  {
    readonly upsertMarket: (market: MarketData) => Effect.Effect<Id<'markets'>, Error>;
    readonly upsertMarketsBatch: (markets: MarketData[]) => Effect.Effect<Id<'markets'>[], Error>;
    readonly recordSnapshot: (
      marketId: Id<'markets'>,
      yesPrice: number,
      noPrice: number,
      volume: number,
    ) => Effect.Effect<Id<'marketSnapshots'>, Error>;
  }
>() {}

// Retry schedule: exponential backoff, max 3 attempts
const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.intersect(Schedule.recurs(3)),
);

const make = Effect.sync(() => {
  // Singleton ConvexHttpClient - safe for long-running service
  const client = new ConvexHttpClient(CONVEX_URL!);

  const upsertMarket = (market: MarketData) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.upsertMarket, market),
      catch: (e) => new Error(`Failed to upsert market: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const upsertMarketsBatch = (markets: MarketData[]) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.upsertMarketsBatch, { markets }),
      catch: (e) => new Error(`Failed to batch upsert markets: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const recordSnapshot = (
    marketId: Id<'markets'>,
    yesPrice: number,
    noPrice: number,
    volume: number,
  ) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.recordSnapshot, {
        marketId,
        yesPrice,
        noPrice,
        volume,
      }),
      catch: (e) => new Error(`Failed to record snapshot: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  return {
    upsertMarket,
    upsertMarketsBatch,
    recordSnapshot,
  };
});

export const ConvexDataLayer = Layer.effect(ConvexDataService, make);
```

#### Phase 2: Wire ConvexDataLayer into AppLayers

**File:** `apps/lofn/src/layers/AppLayers.ts`

```typescript
import { Layer } from 'effect';
import { FetchHttpClient } from '@effect/platform';
import { DataLayer } from '../services/data';
import { ConvexDataLayer } from '../services/data/ConvexDataService';

// Compose all application layers
// DataLayer = local CSV storage (backup)
// ConvexDataLayer = Convex backend (primary)
export const AppLayers = Layer.provideMerge(
  ConvexDataLayer,
  Layer.provideMerge(DataLayer, FetchHttpClient.layer),
);
```

**File:** `apps/lofn/src/main.ts`

```typescript
import { ConvexDataLayer } from './services/data/ConvexDataService';

// Update AppLayer composition
const AppLayer = Layer.provideMerge(
  ConvexDataLayer,
  Layer.provideMerge(DataLayer, FetchHttpClient.layer),
);
```

#### Phase 3: Update WebSocketService to Send to Convex

**File:** `apps/lofn/src/services/polymarket/WebSocketService.ts`

```typescript
import { Effect, Queue, Schema, type Ref } from 'effect';
import type pl from 'nodejs-polars';
import { CONFIG } from '../../config';
import { DataService } from '../data';
import { ConvexDataService, type MarketData } from '../data/ConvexDataService';
import {
  buildMarketRow,
  shouldIncludeTrade,
  type TradeData,
  updateMarketsRef,
  TradeMessageSchema,
  type TradeMessage,
} from '../../domain';

export const websocketEffect = Effect.gen(function* () {
  const { marketsRef } = yield* DataService;
  const convex = yield* ConvexDataService;

  // Create a bounded queue for incoming messages (backpressure protection)
  const messageQueue = yield* Queue.bounded<TradeMessage>(1000);

  // Message processor fiber - runs continuously
  yield* Effect.fork(
    Effect.forever(
      Effect.gen(function* () {
        const msg = yield* Queue.take(messageQueue);
        yield* processTradeMessage(msg, marketsRef, convex);
      }),
    ),
  );

  // WebSocket connection with reconnect logic
  yield* Effect.async<void, never>(() => {
    const connect = () => {
      console.log('Connecting to Polymarket WebSocket...');
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);

      ws.addEventListener('open', () => {
        ws.send(
          JSON.stringify({
            action: 'subscribe',
            subscriptions: [{ topic: 'activity', type: 'orders_matched' }],
          }),
        );
        console.log('WebSocket connected & subscribed');
      });

      ws.addEventListener('message', (event) => {
        try {
          if (!event.data) return;
          const parsed = JSON.parse(event.data);
          const result = Schema.decodeUnknownEither(TradeMessageSchema)(parsed);
          if (result._tag === 'Left') return;
          Effect.runSync(Queue.offer(messageQueue, result.right));
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      });

      ws.addEventListener('close', () => {
        console.log('WebSocket closed, reconnecting in 3s...');
        setTimeout(connect, 3000);
      });

      ws.addEventListener('error', (e) => {
        console.error('WebSocket error:', e);
      });
    };

    connect();
  });
});

const processTradeMessage = (
  data: TradeMessage,
  marketsRef: Ref.Ref<pl.DataFrame>,
  convex: Context.Tag.Service<typeof ConvexDataService>,
) =>
  Effect.gen(function* () {
    if (data.type !== 'orders_matched' || !data.payload) return;

    const t = data.payload;
    if (!t.conditionId || !t.title || !t.size || !t.price || !t.outcome) return;

    const sizeUsd = t.size * t.price;

    const tradeData: TradeData = {
      marketId: t.conditionId,
      eventSlug: t.eventSlug ?? '',
      title: t.title,
      outcome: t.outcome.toUpperCase(),
      price: t.price,
      sizeUsd,
    };

    if (!shouldIncludeTrade(tradeData)) return;

    // 1. Update local CSV (backup)
    const row = buildMarketRow(tradeData);
    yield* updateMarketsRef(marketsRef, row);

    // 2. Send to Convex (primary) - triggers AI analysis automatically
    const marketData: MarketData = {
      polymarketId: t.conditionId,
      conditionId: t.conditionId,
      eventSlug: t.eventSlug ?? '',
      title: t.title,
      currentYesPrice: t.outcome.toUpperCase() === 'YES' ? t.price : 1 - t.price,
      currentNoPrice: t.outcome.toUpperCase() === 'NO' ? t.price : 1 - t.price,
      volume24h: sizeUsd,
      totalVolume: sizeUsd,
      isActive: true,
    };

    yield* convex.upsertMarket(marketData).pipe(
      Effect.catchAll((error) => {
        console.error('Convex upsert failed:', error);
        return Effect.succeed(undefined); // Don't crash on Convex failures
      }),
    );

    console.log(`Trade: ${row.title.slice(0, 50)}... | $${sizeUsd.toFixed(0)} → Convex`);
  });
```

#### Phase 4: Add Analysis Throttling to Convex Backend

The current `upsertMarket` triggers AI analysis on EVERY call. For high-volume markets, this could trigger 100+ analyses/hour. Add throttling.

**File:** `packages/backend/convex/markets.ts`

```typescript
export const upsertMarket = internalMutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('markets')
      .withIndex('by_polymarket_id', (q) => q.eq('polymarketId', args.polymarketId))
      .first();

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
        lastTradeAt: now,
      });

      // Only trigger analysis if not analyzed in last hour
      const shouldAnalyze = !existing.lastAnalyzedAt ||
        (now - existing.lastAnalyzedAt) > ONE_HOUR;

      if (shouldAnalyze) {
        await ctx.scheduler.runAfter(
          0,
          internal.analysis.analyzeMarketWithSwarm,
          { marketId: existing._id },
        );
      }

      return existing._id;
    }

    const marketId = await ctx.db.insert('markets', {
      ...args,
      createdAt: now,
      updatedAt: now,
      lastTradeAt: now,
    });

    // Always analyze new markets
    await ctx.scheduler.runAfter(0, internal.analysis.analyzeMarketWithSwarm, {
      marketId,
    });

    return marketId;
  },
});
```

## Acceptance Criteria

### Functional Requirements

- [ ] ConvexDataService uses `ConvexHttpClient` from `"convex/browser"`
- [ ] ConvexDataLayer is composed into AppLayers
- [ ] WebSocketService calls `convex.upsertMarket()` for each valid trade
- [ ] Trades appear in Convex `markets` table within 5 seconds
- [ ] AI analysis triggers for new markets and hourly for existing markets
- [ ] CSV backup continues to work (dual-write pattern)
- [ ] Error handling with retry logic (max 3 attempts, exponential backoff)

### Non-Functional Requirements

- [ ] No data loss when Convex is temporarily unavailable (retries)
- [ ] Graceful degradation: if Convex fails after retries, log error and continue
- [ ] Analysis throttling prevents >1 analysis/hour per market
- [ ] Console logs show "→ Convex" to indicate successful sends

## Testing Plan

### Unit Tests

```typescript
// apps/lofn/src/services/data/ConvexDataService.test.ts
import { test, expect, mock } from 'bun:test';

test('upsertMarket calls ConvexHttpClient.mutation', async () => {
  // Mock ConvexHttpClient
  // Test Effect.retry behavior
  // Test error handling
});
```

### Integration Tests

1. Start lofn collector with `CONVEX_URL` set
2. Connect to Polymarket WebSocket
3. Verify trades appear in Convex dashboard
4. Verify AI analysis runs for new markets
5. Verify analysis throttling (second trade within hour doesn't trigger)

### Manual Verification

1. Run `bun dev` in apps/lofn
2. Check Convex dashboard for new market entries
3. Verify `insights` table populates after analysis
4. Check console logs show "→ Convex" messages

## Environment Variables

Add to `.env`:

```bash
# Convex Cloud URL (from Convex dashboard)
CONVEX_URL=https://your-deployment.convex.cloud

# Optional: Deploy key for authenticated mutations
# Get from Convex dashboard → Settings → Deploy Keys
CONVEX_DEPLOY_KEY=
```

## Dependencies

No new dependencies - `convex` package already installed in `apps/lofn/package.json`.

## Risks & Mitigations

| Risk                          | Impact                    | Mitigation                     |
| ----------------------------- | ------------------------- | ------------------------------ |
| High volume overwhelms Convex | Data loss, throttling     | Implement batching (Phase 5)   |
| Convex downtime               | No new data for dashboard | Dual-write to CSV, retry logic |
| Analysis cost explosion       | High AI API bills         | Hourly throttling per market   |
| Client lifecycle issues       | Memory leaks, auth errors | Singleton pattern with cleanup |

## Future Enhancements (Out of Scope)

1. **Batching**: Accumulate trades for 5 seconds, send as batch
2. **Health monitoring**: Periodic Convex health check endpoint
3. **Metrics**: Track mutation success rate, latency percentiles
4. **Dashboard**: React app with ConvexReactClient subscriptions

## References

### Internal References

- `apps/lofn/src/services/data/ConvexDataService.ts:12-35` - Current custom fetch implementation
- `apps/lofn/src/services/polymarket/WebSocketService.ts:83-115` - Trade processing (CSV only)
- `packages/backend/convex/markets.ts:12-69` - upsertMarket with analysis trigger
- `apps/lofn/src/layers/AppLayers.ts` - Layer composition (missing ConvexDataLayer)

### External References

- [ConvexHttpClient API](https://docs.convex.dev/api/classes/browser.ConvexHttpClient)
- [Convex Bun Quickstart](https://docs.convex.dev/quickstart/bun)
- [Effect.ts Retry](https://effect.website/docs/guides/error-handling/retrying)

### Related Work

- Commit `6696465` - feat(backend): integrate Effect.ts AI swarm into Convex
- Commit `0b73b2d` - refactor(lofn): remove AI analysis - now handled by Convex
