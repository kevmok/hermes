---
status: completed
priority: p1
issue_id: "002"
tags: [code-review, data-integrity, concurrency]
dependencies: []
completed_date: 2025-12-18
resolution: "Used bounded Queue for backpressure + Ref.update atomic operations. Removed complex Semaphore pattern."
---

# Race Condition in Concurrent Ref Updates

## Problem Statement

Multiple concurrent WebSocket messages can interleave DataFrame updates in `updateMarketsRef`, causing lost updates or inconsistent state. The `Ref.update` function is NOT atomic when the passed function performs complex DataFrame operations.

**Why it matters:** Data corruption risk. At high message volumes, price updates can be lost, creating incorrect market data that feeds into AI analysis.

## Findings

**Location:** `src/domain/market/filters.ts:52-103`

**Race Condition Scenario:**
```
Time 0: Message A reads DataFrame (market X price = 0.50)
Time 1: Message B reads DataFrame (market X price = 0.50)
Time 2: Message A updates DataFrame (market X price = 0.55)
Time 3: Message B updates DataFrame (market X price = 0.60, OVERWRITES A's update)
Result: Price 0.55 is lost
```

**Current Code:**
```typescript
export const updateMarketsRef = (
  marketsRef: Ref.Ref<pl.DataFrame>,
  row: MarketRowData,
) =>
  Effect.gen(function* () {
    yield* Ref.update(marketsRef, (df) => {
      const existingMarkets = df.getColumn("market_id").toArray() as string[];
      const marketExists = existingMarkets.includes(row.market_id);
      // ... DataFrame manipulation - NOT ATOMIC
    });
  });
```

**Evidence:** WebSocket messages arrive continuously. The message processor fiber calls `updateMarketsRef` for each message without serialization.

## Proposed Solutions

### Option A: Semaphore Serialization (Recommended)
Add a Semaphore to serialize all DataFrame updates.

**Pros:**
- Guarantees no interleaving
- Uses Effect.ts primitives correctly
- Simple to implement

**Cons:**
- Reduces throughput (sequential processing)
- May create backpressure under high load

**Effort:** Small (1-2 hours)
**Risk:** Low

```typescript
import { Semaphore } from "effect";

// In DataService
const updateSemaphore = yield* Semaphore.make(1);

// In filters.ts
export const updateMarketsRefSafe = (
  marketsRef: Ref.Ref<pl.DataFrame>,
  row: MarketRowData,
  semaphore: Semaphore.Semaphore,
) =>
  Semaphore.withPermits(semaphore, 1)(
    Effect.gen(function* () {
      yield* Ref.update(marketsRef, (df) => {
        // ... same logic, now serialized
      });
    })
  );
```

### Option B: Per-Market Locking
Use a Map of Semaphores, one per market_id.

**Pros:**
- Higher throughput (parallel updates to different markets)
- Only serializes updates to same market

**Cons:**
- More complex implementation
- Memory overhead for semaphore map

**Effort:** Medium (3-4 hours)
**Risk:** Medium

### Option C: Batch Updates with Debouncing
Collect updates in a buffer, apply in batches.

**Pros:**
- Highest throughput
- Natural deduplication

**Cons:**
- Adds latency to updates
- More complex state management

**Effort:** Medium (4-6 hours)
**Risk:** Medium

## Recommended Action

**Option A** - Semaphore serialization. Simplest fix that guarantees correctness. If throughput becomes an issue later, upgrade to Option B.

## Technical Details

**Affected Files:**
- `src/services/data/DataService.ts` - Add semaphore to service interface
- `src/domain/market/filters.ts` - Update function signature
- `src/services/polymarket/WebSocketService.ts` - Pass semaphore
- `src/services/polymarket/HistoricalService.ts` - Pass semaphore

## Acceptance Criteria

- [ ] Semaphore added to DataService interface
- [ ] updateMarketsRef uses semaphore for serialization
- [ ] All callers updated to pass semaphore
- [ ] No race conditions possible in DataFrame updates
- [ ] Type check passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-18 | Created finding from data integrity review | Effect Ref.update is NOT atomic for complex operations |

## Resources

- Data integrity guardian analysis
- Effect.ts Semaphore documentation
