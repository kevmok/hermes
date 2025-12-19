---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, architecture, database-migration]
dependencies: []
---

# DataService Exposes Raw Polars DataFrames - Blocks Database Migration

## Problem Statement

The DataService exposes its internal storage mechanism (`Ref.Ref<pl.DataFrame>`) directly to consumers, violating the Dependency Inversion Principle. This creates tight coupling that prevents swapping CSV/Polars storage for a database without rewriting all consumers.

**Why it matters:** This is the #1 blocker for scaling from CSV to database storage. All 4 service consumers directly manipulate DataFrames with Polars-specific APIs.

## Findings

**Location:** `src/services/data/DataService.ts:53-63`

```typescript
export class DataService extends Context.Tag("DataService")<
  DataService,
  {
    readonly marketsRef: Ref.Ref<pl.DataFrame>;      // LEAKY ABSTRACTION
    readonly predictionsRef: Ref.Ref<pl.DataFrame>;  // LEAKY ABSTRACTION
    readonly consensusRef: Ref.Ref<pl.DataFrame>;    // LEAKY ABSTRACTION
    readonly loadData: Effect.Effect<void, unknown>;
    readonly saveAll: Effect.Effect<void, unknown>;
  }
>() {}
```

**Consumer Impact - 4 Direct Usages:**
1. `src/services/analysis/AnalysisService.ts:124` - Uses Polars filter/sort APIs directly
2. `src/services/analysis/StatusService.ts:6` - Accesses marketsRef directly
3. `src/services/polymarket/WebSocketService.ts:41` - Passes marketsRef to domain function
4. `src/services/polymarket/HistoricalService.ts:36` - Same pattern

**Evidence of tight coupling:**
```typescript
// AnalysisService.ts:136-137 - Direct Polars API usage
const unanalyzed = markets
  .filter(pl.col("analyzed").eq(pl.lit(false)))  // Polars-specific
  .sort("last_trade_timestamp", true);
```

## Proposed Solutions

### Option A: Repository Pattern (Recommended)
Create a `MarketRepository` interface that abstracts storage operations.

**Pros:**
- Clean separation of concerns
- Easy to swap implementations (CSV → PostgreSQL → SQLite)
- Testable with mock implementations
- Follows Effect.ts best practices

**Cons:**
- Requires updating all 4 consumer services
- ~19-26 hours total migration effort

**Effort:** Large (8-16 hours)
**Risk:** Medium - requires careful refactoring

```typescript
// New interface
export interface MarketRepository {
  findUnanalyzed(limit: number): Effect.Effect<MarketRow[], RepositoryError>;
  saveTrade(trade: MarketRowData): Effect.Effect<void, RepositoryError>;
  markAsAnalyzed(marketIds: string[]): Effect.Effect<void, RepositoryError>;
}

export class MarketRepositoryService extends Context.Tag("MarketRepository")<
  MarketRepositoryService,
  MarketRepository
>() {}
```

### Option B: Facade Methods on DataService
Add query methods to DataService while keeping refs internal.

**Pros:**
- Less invasive change
- Can be done incrementally

**Cons:**
- Still couples consumers to DataService
- Doesn't fully solve the abstraction problem

**Effort:** Medium (4-6 hours)
**Risk:** Low

### Option C: Convex Backend (Target Implementation)
Migrate to Convex for real-time, type-safe database with serverless functions.

**Pros:**
- Real-time sync out of the box
- Type-safe schema with validators
- Serverless functions (queries/mutations)
- No database management
- Built-in indexing

**Cons:**
- External service dependency
- Requires Convex account/deployment
- Learning curve for Convex patterns

**Effort:** Medium (8-12 hours)
**Risk:** Low - Convex is well-documented

## Recommended Action

**Option A + C** - Create Repository abstraction first, then implement Convex repository. This allows keeping Polars/CSV as fallback during development.

## Technical Details

**Affected Files:**
- `src/services/data/DataService.ts` - Complete interface redesign
- `src/services/analysis/AnalysisService.ts` - Remove Polars imports
- `src/services/analysis/StatusService.ts` - Use repository methods
- `src/services/polymarket/WebSocketService.ts` - Use repository methods
- `src/services/polymarket/HistoricalService.ts` - Use repository methods
- `src/domain/market/filters.ts` - Move `updateMarketsRef` to repository

**New Files to Create:**
- `src/repositories/MarketRepository.ts` - Interface definition
- `src/repositories/PolarsMarketRepository.ts` - Current CSV implementation (fallback)
- `src/repositories/ConvexMarketRepository.ts` - Convex implementation
- `src/repositories/errors.ts` - Repository error types
- `convex/schema.ts` - Convex schema definition
- `convex/markets.ts` - Market queries/mutations
- `convex/predictions.ts` - Prediction queries/mutations
- `convex/consensus.ts` - Consensus queries/mutations

**Convex Schema Design:**
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  markets: defineTable({
    market_id: v.string(),
    event_slug: v.string(),
    title: v.string(),
    outcome: v.string(),
    price: v.number(),
    size_usd: v.number(),
    timestamp: v.string(),
    first_seen: v.string(),
    last_trade_timestamp: v.string(),
    analyzed: v.boolean(),
  }).index("by_market_id", ["market_id"])
    .index("by_analyzed", ["analyzed", "last_trade_timestamp"]),

  predictions: defineTable({
    run_id: v.string(),
    timestamp: v.string(),
    market_id: v.string(),
    event_slug: v.string(),
    title: v.string(),
    outcome: v.string(),
    price: v.number(),
    model_name: v.string(),
    decision: v.string(),
    reasoning: v.string(),
    response_time_ms: v.number(),
    consensus_decision: v.string(),
    consensus_percentage: v.number(),
  }).index("by_run_id", ["run_id"])
    .index("by_market_id", ["market_id"]),

  consensus: defineTable({
    timestamp: v.string(),
    run_id: v.string(),
    rank: v.number(),
    market_number: v.number(),
    market_title: v.string(),
    side: v.string(),
    consensus: v.string(),
    consensus_count: v.number(),
    total_models: v.number(),
    link: v.string(),
    reasoning: v.string(),
  }).index("by_run_id", ["run_id"]),
});
```

**ConvexHttpClient Usage:**
```typescript
// src/repositories/ConvexMarketRepository.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

// Query
const unanalyzed = await convex.query(api.markets.findUnanalyzed, { limit: 10 });

// Mutation
await convex.mutation(api.markets.saveTrade, { ...tradeData });
```

## Acceptance Criteria

- [ ] MarketRepository interface defined with all required methods
- [ ] PolarsMarketRepository implements interface with current Polars logic
- [ ] All 4 consumer services updated to use repository
- [ ] No direct Polars imports in service layer
- [ ] Domain layer (filters.ts) has no Polars dependency
- [ ] Type check passes
- [ ] Existing functionality preserved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-18 | Created finding from architecture review | This is the primary blocker for database migration |

## Resources

- Architecture review agent analysis
- Effect.ts Layer pattern documentation
- Clean Architecture principles
