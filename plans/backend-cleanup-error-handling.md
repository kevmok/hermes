# Backend Cleanup & Error Handling Plan

## Overview

Comprehensive cleanup of `packages/backend/convex` to remove dead code, fix error handling, and add Effect.ts patterns.

---

## Phase 1: Remove Dead Code

### 1.1 Remove Scheduled Analysis Cron

**Files:**

- `convex/crons.ts` - Remove lines 6-11 (scheduled analysis cron)
- `convex/scheduledJobs.ts` - Remove `runAutomaticAnalysis` function (lines 4-29)

### 1.2 Remove Orphaned Functions

**Files:**

- `convex/markets.ts` - Remove `getMarketsNeedingAnalysis` query (~lines 191-216) - was for scheduled analysis
- `convex/signals.ts` - Remove duplicate `getRecentSignalForMarketInternal` (~lines 309-325) - exact copy of public version

---

## Phase 2: Fix Critical Error Handling

### 2.1 Use Promise.allSettled for Graceful Degradation

**Files:**

- `convex/insights.ts:165,179` - `getPendingAnalysisRequests` and `enrichInsightsWithMarkets`
- `convex/signals.ts:~450` - `enrichSignalsWithMarkets`
- `convex/events.ts:~236` - `enrichEventsWithMarkets`

**Pattern:**

```typescript
// Before: One failure crashes all
return Promise.all(items.map(async (item) => await ctx.db.get(item.id)));

// After: Promise.allSettled never rejects
const results = await Promise.allSettled(
  items.map(async (item) => {
    const related = await ctx.db.get(item.id);
    return { ...item, related };
  })
);

return results
  .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
  .map(r => r.value);
```

### 2.2 Add Error Handling to Batch Operations

**Files:**

- `convex/markets.ts:117-163` - `upsertMarketsBatch` needs per-item error handling
  - Currently: One failure = silent continuation
  - Fix: Track successes/failures, return summary

### 2.3 Validate Scheduler Calls

**Files:**

- `convex/markets.ts:75,108,165` - Scheduler calls after upserts
- `convex/trades.ts:75,165` - Scheduler calls after inserts
- `convex/analysis.ts:249-256` - Scheduler in requestMarketAnalysis

**Pattern:**

```typescript
// Scheduler calls should be in try/catch with logging
try {
  await ctx.scheduler.runAfter(0, internal.analysis.analyzeTradeForSignal, args);
} catch (error) {
  console.error('Failed to schedule analysis:', error);
  // Don't throw - main operation succeeded
}
```

### 2.4 Fix Silent Failures

**Files:**

- `convex/polymarket/markets.ts:36-55` - Return error info, not just null
- `convex/resolution.ts:117-120,165-168` - Don't mask errors as empty arrays
- `convex/signals.ts:276-284` - `getSignalsWithPagination` swallows errors

---

## Phase 3: Add Effect.ts Error Types

### 3.1 Create Custom Error Types

**New file:** `convex/lib/errors.ts`

```typescript
import { Data } from 'effect';

export class ConvexQueryError extends Data.TaggedError('ConvexQueryError')<{
  operation: string;
  message: string;
  cause?: unknown;
}> {}

export class ConvexMutationError extends Data.TaggedError('ConvexMutationError')<{
  operation: string;
  message: string;
  cause?: unknown;
}> {}

export class PolymarketApiError extends Data.TaggedError('PolymarketApiError')<{
  endpoint: string;
  status?: number;
  message: string;
}> {}

export class AIModelError extends Data.TaggedError('AIModelError')<{
  model: string;
  message: string;
  isRetryable: boolean;
}> {}
```

### 3.2 Improve Existing Effect Usage in polymarket/client.ts

**Files:**

- `convex/polymarket/client.ts` - Already uses Effect well, add timeout wrapper

```typescript
// Add timeout to prevent hanging
const withTimeout = <A, E>(effect: Effect.Effect<A, E>, ms: number) =>
  effect.pipe(
    Effect.timeout(Duration.millis(ms)),
    Effect.mapError(() => new PolymarketApiError({ endpoint: 'unknown', message: 'Timeout' }))
  );
```

### 3.3 Update AI Swarm Error Handling

**Files:**

- `convex/ai/swarm.ts` - Already uses Effect layers
- Ensure partial failures don't crash entire swarm
- Add per-model timeout handling

---

## Phase 4: Fix Query Performance Issues

### 4.1 Fix N+1 Query in Events

**File:** `convex/events.ts:220-262` - `getEventsWithSignalCounts`

- Currently: Fetches markets, then signals for each one-by-one
- Fix: Batch query or parallel fetch with Promise.all

### 4.2 Implement Missing Pagination

**File:** `convex/trades.ts:230-249,320-332`

- `listTrades` and `getTradesBySignal` have `nextCursor: null`
- Implement proper cursor-based pagination

### 4.3 Fix Commented-Out Filter

**File:** `convex/signals.ts:376-392` - `getSignalWithPredictions`

- Has commented-out prediction window filter
- Review and either remove or fix the implementation

---

## Phase 5: Standardize Logging

### 5.1 Use Consistent Logging Patterns

- Keep using `console.log`, `console.error`, `console.warn`
- For Effect code, use `Effect.log`, `Effect.logError`, `Effect.logWarning`
- Ensure all error logs include relevant context (marketId, signalId, etc.)

### 5.2 Add Missing Error Context

- Review existing console.error calls
- Ensure they include operation name and relevant IDs
- Example: `console.error('Failed to enrich market', { marketId, error })`

---

## Phase 6: Convex Best Practices Fixes

### 6.1 Use ConvexError for User-Facing Errors

**Files:** `convex/signals.ts:92`, `convex/analysis.ts:391,403`

```typescript
// Before
throw new Error('Market not found');

// After
import { ConvexError } from 'convex/values';
throw new ConvexError('Market not found');
```

### 6.2 Fix N+1 Query Pattern

**File:** `convex/markets.ts:392-418` - `getUnresolvedMarketsWithSignals`

- Currently: Loops over 100 markets, queries signals for each
- Fix: Use a single batch query or denormalize signal count

### 6.3 Add Search Index (Optional - Future)

**File:** `convex/schema.ts`

- `searchMarkets` does full table scan
- Consider: Add `.searchIndex()` for title field

### 6.4 Avoid In-Memory Sorting

**Files:** `convex/markets.ts:265-272,212-214`

- Replace `.sort()` in JS with index-based ordering
- May require new composite indexes

---

## Files to Modify (Summary)

| File                           | Changes                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `convex/crons.ts`              | Remove scheduled analysis cron                                      |
| `convex/scheduledJobs.ts`      | Remove runAutomaticAnalysis                                         |
| `convex/markets.ts`            | Remove getMarketsNeedingAnalysis, add batch error handling, fix N+1 |
| `convex/signals.ts`            | Remove duplicate query, fix error handling                          |
| `convex/insights.ts`           | Wrap Promise.all with error boundaries                              |
| `convex/events.ts`             | Fix N+1 query, add error handling                                   |
| `convex/trades.ts`             | Implement pagination, validate schedulers                           |
| `convex/analysis.ts`           | Validate scheduler calls, use ConvexError                           |
| `convex/polymarket/markets.ts` | Return error info instead of null                                   |
| `convex/resolution.ts`         | Don't mask errors as empty arrays                                   |
| `convex/ai/swarm.ts`           | Verify partial failure handling                                     |
| `convex/lib/errors.ts`         | NEW - Custom Effect error types                                     |

---

## Implementation Order

1. **Dead code removal** (quick wins, reduces scope)
2. **Promise.allSettled fixes** (prevents cascading failures)
3. **Custom error types** (foundation for better handling)
4. **ConvexError for user-facing errors** (better client experience)
5. **Batch operation error handling** (data integrity)
6. **Scheduler validation** (reliability)
7. **Fix N+1 queries** (performance)
8. **Standardize logging context** (add missing error context)

---

## Notes

- Keep watchlist and performance metrics functions (for future frontend)
- The polymarket/client.ts is already well-designed with Effect - use as reference
- Focus on consistency - same error patterns everywhere
- Consider adding auth to public mutations in future iteration
