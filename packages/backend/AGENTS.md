# BACKEND - Convex Serverless

Real-time database + serverless functions for trades, signals, and AI analysis.

## STRUCTURE

```
convex/
├── schema.ts          # Database schema (all tables)
├── _generated/        # Auto-generated (DO NOT EDIT)
├── ai/
│   ├── swarm.ts       # AI consensus orchestration
│   ├── models.ts      # Model configurations
│   └── schema.ts      # AI-specific validators
├── polymarket/
│   ├── client.ts      # Polymarket API client
│   ├── markets.ts     # Market data fetching
│   └── events.ts      # Event data fetching
├── lib/
│   └── errors.ts      # Error utilities
├── trades.ts          # Trade ingestion + whale detection
├── signals.ts         # Signal queries + mutations
├── markets.ts         # Market CRUD
├── events.ts          # Event aggregation
├── insights.ts        # AI insight queries
├── crons.ts           # Scheduled job definitions
└── scheduledJobs.ts   # Job implementations
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add table | `schema.ts` - defineTable + indexes |
| Add query | Feature file (e.g., `signals.ts`) - export query |
| Add mutation | Feature file - export mutation |
| Add external API call | Use `action` not mutation |
| Modify AI consensus | `ai/swarm.ts` |
| Add scheduled job | `crons.ts` + `scheduledJobs.ts` |
| Fetch Polymarket data | `polymarket/` directory |

## SCHEMA (Key Tables)

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `trades` | Raw WebSocket trades | `by_condition_id`, `by_whale`, `by_timestamp` |
| `signals` | AI consensus results | `by_market`, `by_high_confidence` |
| `markets` | Market metadata | `by_polymarket_id`, `by_slug` |
| `events` | Event aggregations | `by_event_slug`, `by_volume` |
| `insights` | Batch analysis results | `by_market`, `by_confidence_level` |
| `globalFilters` | Singleton config | - |

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
  ai/swarm.ts: runConsensusAnalysis
         ↓
  Parallel calls to 3 models:
  ├── Claude claude-sonnet-4-20250514 (Anthropic)
  ├── GPT-4o (OpenAI)
  └── Gemini 1.5 Pro (Google)
         ↓
  Aggregate votes → consensus decision
         ↓
  Store in signals table
```

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
