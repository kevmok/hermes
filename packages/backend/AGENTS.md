# BACKEND - Convex Serverless

Real-time database + serverless functions for trades, signals, smart triggers, and AI analysis.

## STRUCTURE

```
convex/
├── schema.ts          # Database schema (635 lines - all tables + indexes)
├── _generated/        # Auto-generated (DO NOT EDIT)
├── ai/
│   ├── swarm.ts       # AI consensus orchestration (647 lines)
│   ├── models.ts      # Model configurations (QUICK/FULL/EVENT)
│   └── schema.ts      # AI-specific validators (Effect Schema)
├── polymarket/
│   ├── client.ts      # Polymarket API client
│   ├── markets.ts     # Market data fetching
│   └── events.ts      # Event data fetching
├── lib/
│   └── errors.ts      # Error utilities
├── trades.ts          # Trade ingestion + whale detection
├── signals.ts         # Signal queries + mutations (652 lines)
├── markets.ts         # Market CRUD
├── events.ts          # Event aggregation
├── analysis.ts        # AI analysis orchestration (1257 lines)
├── smartTriggers.ts   # Smart alert detection (631 lines)
├── insights.ts        # AI insight queries
├── crons.ts           # Scheduled job definitions
└── scheduledJobs.ts   # Job implementations
```

## WHERE TO LOOK

| Task                   | Location                                         |
| ---------------------- | ------------------------------------------------ |
| Add table              | `schema.ts` - defineTable + indexes              |
| Add query              | Feature file (e.g., `signals.ts`) - export query |
| Add mutation           | Feature file - export mutation                   |
| Add external API call  | Use `action` not mutation                        |
| Modify AI consensus    | `ai/swarm.ts`                                    |
| Add scheduled job      | `crons.ts` + `scheduledJobs.ts`                  |
| Fetch Polymarket data  | `polymarket/` directory                          |
| Add smart trigger type | `smartTriggers.ts`                               |

## SCHEMA (Key Tables)

| Table            | Purpose                 | Key Indexes                                    |
| ---------------- | ----------------------- | ---------------------------------------------- |
| `trades`         | Raw WebSocket trades    | `by_condition_id`, `by_whale`, `by_timestamp`  |
| `signals`        | AI consensus results    | `by_market`, `by_high_confidence`              |
| `markets`        | Market metadata         | `by_polymarket_id`, `by_slug`                  |
| `events`         | Event aggregations      | `by_event_slug`, `by_volume`                   |
| `smartTriggers`  | Opportunity alerts      | `by_status_score`, `by_market_status`          |
| `priceSnapshots` | Price history (4h)      | `by_market_timestamp`                          |
| `insights`       | Batch analysis results  | `by_market`, `by_confidence_level`             |
| `globalFilters`  | Singleton config        | -                                              |

## FUNCTION TYPES

```typescript
// Query - read-only, reactive, real-time
export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(signalValidator),
  handler: async (ctx, args): Promise<Signal[]> => {
    return await ctx.db.query("signals").take(args.limit ?? 50);
  },
});

// Mutation - write operations, transactional
export const create = mutation({
  args: { marketId: v.id("markets"), ... },
  returns: v.id("signals"),
  handler: async (ctx, args): Promise<Id<"signals">> => {
    return await ctx.db.insert("signals", { ... });
  },
});

// Action - external API calls (AI, HTTP)
export const analyzeMarket = action({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    // Can call external APIs
    // Call mutations via: await ctx.runMutation(internal.signals.create, {});
  },
});

// Internal - not exposed to clients
export const internalCreate = internalMutation({ ... });
```

## AI SWARM

```
Trade triggers whale threshold
         ↓
  Tiered routing (Bronze/Silver/Gold/Platinum)
         ↓
  ai/swarm.ts: queryFullSwarm / queryQuickSwarm / queryEventSwarm
         ↓
  Parallel calls to 3 models:
  ├── Claude claude-sonnet-4-20250514 (Anthropic)
  ├── GPT-4o (OpenAI)
  └── Gemini 1.5 Pro (Google)
         ↓
  Confidence-weighted consensus
         ↓
  Store in signals table
```

## SMART TRIGGERS

Three trigger types detected automatically:

| Type                  | Detection Logic                              | Score Factors          |
| --------------------- | -------------------------------------------- | ---------------------- |
| `price_movement`      | 10%+ price change in 4 hours                 | Magnitude, volume      |
| `contrarian_whale`    | Whale bets opposite of AI consensus          | Whale win rate, size   |
| `resolution_proximity`| Near resolution + extreme price (>85%/<15%)  | Time to resolve, price |

Called from lofn via:
- `trackTradePrice` - Records snapshots, detects movements
- `checkContrarianWhale` - Compares whale vs consensus

## TYPING INTERNAL FUNCTIONS

Always add explicit types to avoid circular inference:

```typescript
// REQUIRED: returns validator + handler return type
export const myAction = internalAction({
  args: { id: v.id('markets') },
  returns: v.object({ success: v.boolean() }),  // ADD THIS
  handler: async (ctx, args): Promise<{ success: boolean }> => {  // AND THIS
    return { success: true };
  },
});
```

## CRON JOBS

| Job                    | Schedule      | Purpose                          |
| ---------------------- | ------------- | -------------------------------- |
| `runAutomaticAnalysis` | Every 30 min  | Batch analyze high-volume markets|
| `cleanupOldData`       | Daily 4AM UTC | Prune old snapshots/predictions  |
| `expireOldTriggers`    | Every hour    | Expire stale smart triggers      |
| `cleanupOldTriggers`   | Daily 5AM UTC | Delete expired triggers          |
