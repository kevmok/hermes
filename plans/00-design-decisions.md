# Design Decisions - Whale Trade Signal System

This document captures key design decisions made during planning for the Lofn signal tracking system.

## Clarified Decisions

### 1. Trade Size Calculation

**Decision:** Size is already in USD from Polymarket WebSocket.

**Current code to update:**

```typescript
// apps/lofn/src/services/polymarket/WebSocketService.ts:99
// BEFORE: const sizeUsd = t.size * t.price;
// AFTER:  const sizeUsd = t.size;  // Already USD
```

**Impact:** Removes incorrect multiplication, trade sizes will be accurate.

---

### 2. Deduplication Strategy

**Decision:** Aggregate multiple trades into a single signal within the time window.

**Implementation:**

- If a trade arrives within 60 seconds of an existing signal on same market:
  - Update the signal's `triggerTrade` to be an **array of trades**
  - Add the new trade to the array
  - Re-run AI analysis only if new trade is significantly larger (2x+)
- This lets users see "3 whale trades totaling $200k" rather than separate signals

**Schema change:**

```typescript
triggerTrade: v.union(
  // Single trade (backwards compat)
  v.object({
    size: v.number(),
    price: v.number(),
    side: v.union(v.literal("YES"), v.literal("NO")),
    taker: v.optional(v.string()),
    timestamp: v.number(),
  }),
  // Multiple trades aggregated
  v.array(v.object({
    size: v.number(),
    price: v.number(),
    side: v.union(v.literal("YES"), v.literal("NO")),
    taker: v.optional(v.string()),
    timestamp: v.number(),
  }))
),
```

---

### 3. Consensus Thresholds

**Decision:**

- **Minimum to create signal:** 60% consensus
- **High confidence badge:** 80%+ consensus

**Implementation:**

```typescript
// Don't create signal if consensus < 60%
if (swarmResponse.consensusPercentage < 60) {
  return null;
}

// Confidence levels
const confidenceLevel =
  consensusPercentage >= 80 ? 'high' :
  consensusPercentage >= 60 ? 'medium' : 'low';

// isHighConfidence flag
isHighConfidence: consensusPercentage >= 80
```

**Note:** Aligns `isHighConfidence` with `confidenceLevel === 'high'` at 80%.

---

### 4. Invalid Outcome Handling

**Decision:** Store INVALID outcomes but mark them as non-applicable in metrics.

**Schema update to markets:**

```typescript
outcome: v.optional(v.union(
  v.literal("YES"),
  v.literal("NO"),
  v.literal("INVALID"),  // NEW
  v.null()
)),
```

**Metrics calculation:**

```typescript
// Only count YES/NO outcomes in win rate
if (outcome === 'YES' || outcome === 'NO') {
  predictionsEvaluated++;
  if (signal.consensusDecision === outcome) {
    correctPredictions++;
  }
}
// INVALID outcomes are tracked but don't affect accuracy
```

---

### 5. Performance Metrics Caching

**Decision:** Cache for 5 minutes.

**Implementation:**

- Add `performanceStats` singleton table
- Background job recalculates every 5 minutes
- Frontend queries cached stats (instant)
- Manual refresh button triggers immediate recalculation

```typescript
// packages/backend/convex/schema.ts
performanceStats: defineTable({
  totalSignals: v.number(),
  winRate: v.number(),
  simulatedROI: v.number(),
  signalsLast24h: v.number(),
  signalsLast7d: v.number(),
  // ... other cached metrics
  calculatedAt: v.number(),
}),
```

---

### 6. Processor Restart Behavior

**Decision:** Resume from current, accept potential data loss during downtime.

**Rationale:**

- Simplifies architecture
- Historical API already fetches last 24h on startup
- Missing a few trades during brief restart is acceptable

**No changes needed** - existing behavior is correct.

---

### 7. Latency Target

**Decision:** Under 2 minutes from trade to frontend display.

**Breakdown:**

- Trade → Filter: ~10ms (existing)
- Filter → Convex: ~100ms (existing)
- Convex → AI Swarm: 30-90 seconds (3 models in parallel)
- AI → Signal stored: ~100ms
- Signal → Frontend (subscription): ~500ms
- **Total:** 30-120 seconds typical

**Implementation:** No changes needed, current architecture meets target.

---

## Summary Table

| Decision         | Value            | Impact                           |
| ---------------- | ---------------- | -------------------------------- |
| Trade size       | Already USD      | Fix multiplication bug           |
| Deduplication    | Aggregate trades | Schema change, richer signals    |
| Min consensus    | 60%              | Fewer but higher quality signals |
| High confidence  | 80%              | Aligned with confidence level    |
| Invalid outcomes | Track separately | Clean metrics, historical record |
| Metrics caching  | 5 min TTL        | Fast dashboard, slight staleness |
| Restart behavior | Resume current   | No backfill complexity           |
| Latency target   | < 2 min          | Current arch is sufficient       |

---

## Open Items

None - all critical questions resolved.
