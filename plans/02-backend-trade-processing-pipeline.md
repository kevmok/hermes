# Plan 2: Backend Trade Processing Pipeline - Signal Generation

## Overview

Extend the existing `apps/lofn` trade collector service to generate whale trade signals. The WebSocket connection and filtering already exist - this plan adds signal storage with trade context and deduplication.

## Existing Architecture (Already Implemented)

The `apps/lofn` service already provides:

1. **WebSocket Connection** (`apps/lofn/src/services/polymarket/WebSocketService.ts`)
   - Connects to `wss://ws-live-data.polymarket.com`
   - Subscribes to `orders_matched` events
   - Bounded queue (1000 messages) with backpressure protection
   - Auto-reconnect on disconnect (3s delay)

2. **Trade Filtering** (`apps/lofn/src/domain/market/filters.ts`)
   - Min trade size: $500 (configurable)
   - Price range: 0.02 - 0.98 (excludes near-certain outcomes)
   - Keyword exclusions: crypto, sports terms

3. **Convex Integration** (`apps/lofn/src/services/data/ConvexDataService.ts`)
   - `upsertMarket()` sends trades to Convex
   - Convex `markets.upsertMarket` triggers AI analysis via `analyzeMarketWithSwarm`

## What This Plan Adds

The current flow sends trades to Convex which triggers AI analysis and stores insights. However:

- **No whale trade context** - insights don't capture the triggering trade details
- **No deduplication** - same market can be analyzed multiple times per minute
- **Insights vs Signals** - insights are time-based, signals are trade-triggered

This plan modifies the flow to:

1. Store signal with trade context (size, side, price at trigger)
2. Add deduplication (1 signal per market per minute)
3. Create explicit `signals` table separate from `insights`

## Technical Approach

### Modified Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                 apps/lofn Trade Collector (EXISTING)             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Polymarket  │───▶│ shouldInclude│───▶│ upsertMarket()   │   │
│  │   WebSocket  │    │    Trade()   │    │ (Convex)         │   │
│  │   (EXISTING) │    │  (EXISTING)  │    │ (EXISTING)       │   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
└──────────────────────────────────────────────────│──────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│               packages/backend Convex Functions                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │upsertMarket  │───▶│ dedup check  │───▶│ analyzeMarket    │   │
│  │ (mutation)   │    │ (NEW logic)  │    │ WithSwarm        │   │
│  │              │    │              │    │ (EXISTING)       │   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                    │              │
│                                                    ▼              │
│                        ┌─────────────────────────────────────┐   │
│                        │  createSignal() (NEW)               │   │
│                        │  - stores trade context             │   │
│                        │  - links to AI consensus            │   │
│                        └─────────────────────────────────────┘   │
│                                                    │              │
│  ┌────────────────────────────────────────────────▼────────────┐ │
│  │                    Convex Database                          │ │
│  │  signals (NEW) │ markets │ insights │ modelPredictions     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Modify

| File                                                    | Changes                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/backend/convex/markets.ts`                    | Add trade context to `upsertMarket`, trigger signal creation |
| `packages/backend/convex/analysis.ts`                   | Modify `analyzeMarketWithSwarm` to return signal-ready data  |
| `packages/backend/convex/signals.ts`                    | Add `createSignalFromAnalysis` internal mutation             |
| `apps/lofn/src/services/polymarket/WebSocketService.ts` | Pass trade details to upsert (minor)                         |
| `apps/lofn/src/services/data/ConvexDataService.ts`      | Update `MarketData` type with trade context                  |

### Global Filters Schema

```typescript
// packages/backend/convex/schema.ts (add to schema)

globalFilters: defineTable({
  // Singleton document - only one exists
  minTradeSize: v.number(),           // e.g., 500 USD
  maxPriceYes: v.number(),            // e.g., 0.98
  minPriceYes: v.number(),            // e.g., 0.02
  minVolume24h: v.number(),           // e.g., 10000 USD
  excludedCategories: v.array(v.string()),
  deduplicationWindowMs: v.number(),  // e.g., 60000 (1 minute)
  isEnabled: v.boolean(),
  updatedAt: v.number(),
}),
```

### Global Filters Module

```typescript
// packages/backend/convex/globalFilters.ts

import { v } from 'convex/values';
import { mutation, query, internalQuery } from './_generated/server';

// Default filter values
const DEFAULT_FILTERS = {
  minTradeSize: 500,
  maxPriceYes: 0.98,
  minPriceYes: 0.02,
  minVolume24h: 10000,
  excludedCategories: [],
  deduplicationWindowMs: 60000, // 1 minute
  isEnabled: true,
};

export const getFilters = query({
  args: {},
  handler: async (ctx) => {
    const filters = await ctx.db.query('globalFilters').first();
    if (!filters) {
      return { ...DEFAULT_FILTERS, _id: null };
    }
    return filters;
  },
});

export const getFiltersInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const filters = await ctx.db.query('globalFilters').first();
    return filters ?? DEFAULT_FILTERS;
  },
});

export const updateFilters = mutation({
  args: {
    minTradeSize: v.optional(v.number()),
    maxPriceYes: v.optional(v.number()),
    minPriceYes: v.optional(v.number()),
    minVolume24h: v.optional(v.number()),
    excludedCategories: v.optional(v.array(v.string())),
    deduplicationWindowMs: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('globalFilters').first();

    const updates = {
      ...args,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create singleton document
    return await ctx.db.insert('globalFilters', {
      ...DEFAULT_FILTERS,
      ...updates,
    });
  },
});

export const initializeFilters = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('globalFilters').first();
    if (existing) return existing._id;

    return await ctx.db.insert('globalFilters', {
      ...DEFAULT_FILTERS,
      updatedAt: Date.now(),
    });
  },
});
```

### Trade Stream Service (Effect.ts)

```typescript
// apps/lofn/src/services/trade/TradeStreamService.ts

import { Context, Effect, Layer, Stream, Schedule, Duration } from 'effect';
import WebSocket from 'ws';

// Types matching Polymarket RTDS format
interface PolymarketTrade {
  type: 'matched_trades';
  asset_id: string;        // Condition ID
  side: 'BUY' | 'SELL';
  price: number;
  size: number;            // In shares, not USD
  taker_address?: string;
  timestamp: number;
  market_id?: string;
}

interface TradeEvent {
  conditionId: string;
  side: 'YES' | 'NO';
  price: number;
  sizeUsd: number;
  taker?: string;
  timestamp: number;
}

// Service interface
export class TradeStreamService extends Context.Tag('TradeStreamService')<
  TradeStreamService,
  {
    readonly connect: () => Effect.Effect<void, Error>;
    readonly trades: Stream.Stream<TradeEvent, Error>;
  }
>() {}

// Implementation
const RTDS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

const makeTradeStreamService = Effect.gen(function* () {
  let ws: WebSocket | null = null;
  const tradeQueue: TradeEvent[] = [];

  const connect = Effect.async<void, Error>((resume) => {
    ws = new WebSocket(RTDS_URL);

    ws.on('open', () => {
      console.log('Connected to Polymarket RTDS');

      // Subscribe to all trade events
      ws?.send(JSON.stringify({
        type: 'subscribe',
        channel: 'market',
        assets_ids: [], // Empty = all markets
      }));

      resume(Effect.succeed(undefined));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const messages = JSON.parse(data.toString());

        for (const msg of Array.isArray(messages) ? messages : [messages]) {
          if (msg.event_type === 'trade' || msg.type === 'matched_trades') {
            const trade = parseTradeMessage(msg);
            if (trade) {
              tradeQueue.push(trade);
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for non-trade messages
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    ws.on('close', () => {
      console.log('WebSocket closed, will reconnect...');
    });
  });

  const trades = Stream.repeatEffect(
    Effect.async<TradeEvent | null, Error>((resume) => {
      const checkQueue = () => {
        if (tradeQueue.length > 0) {
          resume(Effect.succeed(tradeQueue.shift()!));
        } else {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    })
  ).pipe(
    Stream.filter((t): t is TradeEvent => t !== null)
  );

  return {
    connect,
    trades,
  };
});

function parseTradeMessage(msg: any): TradeEvent | null {
  try {
    // Adapt to actual Polymarket message format
    const price = Number(msg.price) || Number(msg.outcome_prices?.[0]) || 0;
    const size = Number(msg.size) || Number(msg.amount) || 0;

    // Convert size from shares to approximate USD
    const sizeUsd = size * price;

    return {
      conditionId: msg.asset_id || msg.condition_id || msg.market,
      side: msg.side === 'BUY' ? 'YES' : 'NO',
      price,
      sizeUsd,
      taker: msg.taker_address || msg.maker,
      timestamp: msg.timestamp || Date.now(),
    };
  } catch {
    return null;
  }
}

export const TradeStreamLive = Layer.effect(
  TradeStreamService,
  makeTradeStreamService
);
```

### Trade Filter Service

```typescript
// apps/lofn/src/services/trade/TradeFilterService.ts

import { Context, Effect, Layer } from 'effect';

interface FilterConfig {
  minTradeSize: number;
  maxPriceYes: number;
  minPriceYes: number;
  minVolume24h: number;
  excludedCategories: string[];
}

interface TradeEvent {
  conditionId: string;
  side: 'YES' | 'NO';
  price: number;
  sizeUsd: number;
  taker?: string;
  timestamp: number;
}

interface MarketContext {
  polymarketId: string;
  title: string;
  category?: string;
  volume24h: number;
  currentYesPrice: number;
}

export class TradeFilterService extends Context.Tag('TradeFilterService')<
  TradeFilterService,
  {
    readonly shouldProcess: (
      trade: TradeEvent,
      market: MarketContext | null,
      config: FilterConfig
    ) => boolean;
    readonly formatTradeSize: (sizeUsd: number) => string;
  }
>() {}

const makeTradeFilterService = Effect.succeed({
  shouldProcess: (
    trade: TradeEvent,
    market: MarketContext | null,
    config: FilterConfig
  ): boolean => {
    // Must have market context
    if (!market) return false;

    // Size filter
    if (trade.sizeUsd < config.minTradeSize) return false;

    // Price range filter (avoid near-certain outcomes)
    const yesPrice = trade.side === 'YES' ? trade.price : 1 - trade.price;
    if (yesPrice < config.minPriceYes || yesPrice > config.maxPriceYes) {
      return false;
    }

    // Volume filter
    if (market.volume24h < config.minVolume24h) return false;

    // Category exclusion
    if (market.category && config.excludedCategories.includes(market.category)) {
      return false;
    }

    return true;
  },

  formatTradeSize: (sizeUsd: number): string => {
    if (sizeUsd >= 100000) return '$100k+ Whale';
    if (sizeUsd >= 50000) return '$50k+ Whale';
    if (sizeUsd >= 10000) return '$10k+ Trade';
    if (sizeUsd >= 5000) return '$5k+ Trade';
    if (sizeUsd >= 1000) return '$1k+ Trade';
    return `$${Math.round(sizeUsd)}`;
  },
});

export const TradeFilterLive = Layer.succeed(
  TradeFilterService,
  makeTradeFilterService
);
```

### Signal Generator Service

```typescript
// apps/lofn/src/services/trade/SignalGeneratorService.ts

import { Context, Effect, Layer } from 'effect';
import { ConvexHttpClient } from 'convex/browser';
import { api, internal } from 'backend/convex/_generated/api';
import { querySwarm, buildPrompt } from 'backend/convex/ai/swarm';

interface TradeEvent {
  conditionId: string;
  side: 'YES' | 'NO';
  price: number;
  sizeUsd: number;
  taker?: string;
  timestamp: number;
}

interface SignalResult {
  signalId: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  consensusPercentage: number;
}

export class SignalGeneratorService extends Context.Tag('SignalGeneratorService')<
  SignalGeneratorService,
  {
    readonly processTradeToSignal: (
      trade: TradeEvent,
      marketId: string,
      market: { title: string; currentYesPrice: number; eventSlug: string }
    ) => Effect.Effect<SignalResult | null, Error>;
    readonly checkDeduplication: (
      marketId: string,
      windowMs: number
    ) => Effect.Effect<boolean, Error>;
  }
>() {}

const makeSignalGeneratorService = (client: ConvexHttpClient) =>
  Effect.succeed({
    processTradeToSignal: (trade, marketId, market) =>
      Effect.gen(function* () {
        // Build prompts and query AI swarm
        const { systemPrompt, userPrompt } = buildPrompt(market);
        const swarmResponse = yield* Effect.tryPromise(() =>
          Effect.runPromise(querySwarm(systemPrompt, userPrompt))
        );

        // Skip if no clear decision
        if (swarmResponse.consensusDecision === 'NO_TRADE') {
          return null;
        }

        // Skip low consensus
        if (swarmResponse.consensusPercentage < 50) {
          return null;
        }

        // Aggregate reasoning
        const aggregatedReasoning = swarmResponse.results
          .filter((r) => r.decision === swarmResponse.consensusDecision)
          .map((r) => `${r.modelName}: ${r.reasoning.slice(0, 200)}`)
          .join(' | ');

        // Create signal via Convex mutation
        const signalId = yield* Effect.tryPromise(() =>
          client.mutation(api.signals.createSignal, {
            marketId: marketId as any,
            triggerTrade: {
              size: trade.sizeUsd,
              price: trade.price,
              side: trade.side,
              taker: trade.taker,
              timestamp: trade.timestamp,
            },
            consensusDecision: swarmResponse.consensusDecision,
            consensusPercentage: swarmResponse.consensusPercentage,
            totalModels: swarmResponse.totalModels,
            agreeingModels: swarmResponse.successfulModels,
            aggregatedReasoning,
            priceAtTrigger: market.currentYesPrice,
          })
        );

        return {
          signalId,
          decision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
        };
      }),

    checkDeduplication: (marketId, windowMs) =>
      Effect.tryPromise(async () => {
        const recent = await client.query(api.signals.getRecentSignalForMarket, {
          marketId: marketId as any,
          withinMs: windowMs,
        });
        return recent === null; // true if no recent signal (OK to proceed)
      }),
  });

export const SignalGeneratorLive = (convexUrl: string) =>
  Layer.effect(
    SignalGeneratorService,
    Effect.sync(() => {
      const client = new ConvexHttpClient(convexUrl);
      return makeSignalGeneratorService(client);
    }).pipe(Effect.flatten)
  );
```

### Main Trade Processor

```typescript
// apps/lofn/src/services/trade/TradeProcessor.ts

import { Effect, Stream, Schedule, Duration, Layer } from 'effect';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'backend/convex/_generated/api';
import { TradeStreamService, TradeStreamLive } from './TradeStreamService';
import { TradeFilterService, TradeFilterLive } from './TradeFilterService';
import { SignalGeneratorService, SignalGeneratorLive } from './SignalGeneratorService';

export const runTradeProcessor = (convexUrl: string) =>
  Effect.gen(function* () {
    const client = new ConvexHttpClient(convexUrl);

    const stream = yield* TradeStreamService;
    const filter = yield* TradeFilterService;
    const generator = yield* SignalGeneratorService;

    // Connect to WebSocket
    yield* stream.connect;

    console.log('Trade processor started, listening for whale trades...');

    // Process trades as they come in
    yield* stream.trades.pipe(
      Stream.mapEffect((trade) =>
        Effect.gen(function* () {
          // Fetch filter config
          const filters = yield* Effect.tryPromise(() =>
            client.query(api.globalFilters.getFilters, {})
          );

          if (!filters.isEnabled) {
            return null;
          }

          // Look up market by condition ID
          const market = yield* Effect.tryPromise(() =>
            client.query(api.markets.getMarketByPolymarketId, {
              polymarketId: trade.conditionId,
            })
          );

          if (!market) {
            console.log(`Unknown market for condition: ${trade.conditionId}`);
            return null;
          }

          // Apply filters
          if (!filter.shouldProcess(trade, {
            polymarketId: market.polymarketId,
            title: market.title,
            category: market.category,
            volume24h: market.volume24h,
            currentYesPrice: market.currentYesPrice,
          }, filters)) {
            return null;
          }

          // Check deduplication
          const canProceed = yield* generator.checkDeduplication(
            market._id,
            filters.deduplicationWindowMs
          );

          if (!canProceed) {
            console.log(`Skipping duplicate signal for: ${market.title}`);
            return null;
          }

          // Generate signal
          const sizeLabel = filter.formatTradeSize(trade.sizeUsd);
          console.log(`\n${sizeLabel} detected on: ${market.title}`);
          console.log(`  Side: ${trade.side}, Price: ${(trade.price * 100).toFixed(1)}%`);

          const result = yield* generator.processTradeToSignal(trade, market._id, {
            title: market.title,
            currentYesPrice: market.currentYesPrice,
            eventSlug: market.eventSlug,
          });

          if (result) {
            console.log(`  Signal: ${result.decision} (${result.consensusPercentage.toFixed(0)}% consensus)`);
          }

          return result;
        }).pipe(
          Effect.catchAll((error) => {
            console.error('Error processing trade:', error);
            return Effect.succeed(null);
          })
        )
      ),
      Stream.filter((r) => r !== null),
      Stream.runDrain
    );
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        TradeStreamLive,
        TradeFilterLive,
        SignalGeneratorLive(convexUrl)
      )
    ),
    // Auto-reconnect on failure
    Effect.retry(
      Schedule.exponential(Duration.seconds(5)).pipe(
        Schedule.union(Schedule.spaced(Duration.minutes(1)))
      )
    )
  );
```

## Acceptance Criteria

### Functional Requirements

- [ ] `globalFilters` table created with all config fields
- [ ] `getFilters` and `updateFilters` mutations work correctly
- [ ] TradeStreamService connects to Polymarket RTDS WebSocket
- [ ] TradeFilterService correctly applies all filter criteria
- [ ] SignalGeneratorService creates signals via Convex mutation
- [ ] Deduplication prevents duplicate signals within time window
- [ ] Trade processor reconnects automatically on disconnect

### Non-Functional Requirements

- [ ] WebSocket connection stable over 24+ hours
- [ ] Trade processing latency < 5 seconds from trade to signal
- [ ] Memory usage stable (no leaks from accumulating trades)

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] Manual test: Process at least 5 whale trades successfully
- [ ] Reconnection test: Recover from network disconnect

## Implementation Steps

1. **Add globalFilters schema** - Schema and module for filter config
2. **Create TradeStreamService** - WebSocket connection to RTDS
3. **Create TradeFilterService** - Filtering logic
4. **Create SignalGeneratorService** - AI swarm integration
5. **Create TradeProcessor** - Main orchestration
6. **Add entrypoint** - CLI command to start processor
7. **Test end-to-end** - Verify signal creation flow

## Dependencies

- Plan 1: Backend Schema (signals table must exist)

## Risk Analysis

| Risk                        | Likelihood | Impact | Mitigation                             |
| --------------------------- | ---------- | ------ | -------------------------------------- |
| WebSocket rate limiting     | Medium     | High   | Implement backoff, respect rate limits |
| AI API costs on high volume | Medium     | Medium | Deduplication, min trade size filter   |
| RTDS message format changes | Low        | High   | Flexible parsing, log unknown formats  |
| Convex action timeout       | N/A        | N/A    | Using external service, not action     |

## References

### Internal References

- Existing Effect.ts patterns: `apps/lofn/src/services/`
- AI swarm: `packages/backend/convex/ai/swarm.ts`
- Convex client pattern: `apps/lofn/src/services/data/ConvexDataService.ts`

### External References

- Polymarket RTDS: https://github.com/Polymarket/real-time-data-client
- Effect.ts Stream: https://effect.website/docs/stream
- Convex HTTP client: https://docs.convex.dev/client/javascript
