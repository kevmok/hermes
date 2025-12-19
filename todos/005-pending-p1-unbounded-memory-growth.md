---
status: completed
priority: p1
issue_id: "005"
tags: [code-review, performance, memory, scalability]
dependencies: []
completed_date: 2025-12-18
resolution: "Added pruneOldData function to DataService with retention periods. Scheduled to run hourly in main.ts."
---

# Unbounded DataFrame Memory Growth

## Problem Statement

All three DataFrames (`marketsRef`, `predictionsRef`, `consensusRef`) grow unbounded with no pruning strategy. At scale, this will exhaust memory and crash the application.

**Why it matters:** At 100x scale (~100,000 markets, 1000 analysis runs), memory usage will reach 1-2 GB. At 1000x scale, the system will crash with OOM errors. CSV writes will also become extremely slow (30-60 seconds).

## Findings

**Location:** `src/services/data/DataService.ts:66-68`

```typescript
const marketsRef = yield* Ref.make(createEmptyMarketsDF());
const predictionsRef = yield* Ref.make(createEmptyPredictionsDF());
const consensusRef = yield* Ref.make(createEmptyConsensusDF());
```

**Growth Projections:**

| Scale | Markets | Predictions | Memory | CSV Write Time |
|-------|---------|-------------|--------|----------------|
| Current (1x) | 100 | 1,000 | ~5 MB | ~50ms |
| 10x | 1,000 | 10,000 | ~50 MB | ~200ms |
| 100x | 10,000 | 100,000 | ~500 MB | **2-5s** |
| 1000x | 100,000 | 1,000,000 | **5-10 GB** | **30-60s** |

**Evidence:** No cleanup or rotation logic exists anywhere in the codebase.

## Proposed Solutions

### Option A: Time-Based Pruning (Recommended)
Add scheduled pruning that removes old data.

**Pros:**
- Simple to implement
- Predictable memory usage
- Preserves recent data for analysis

**Cons:**
- Loses historical data
- Requires choosing retention period

**Effort:** Small (2-3 hours)
**Risk:** Low

```typescript
const pruneOldData = Effect.gen(function* () {
  const cutoffDays = 30;
  const cutoffDate = new Date(Date.now() - cutoffDays * 86400000).toISOString();

  // Prune predictions older than 30 days
  yield* Ref.update(predictionsRef, (df) =>
    df.filter(pl.col("timestamp").gt(pl.lit(cutoffDate)))
  );

  // Prune consensus older than 30 days
  yield* Ref.update(consensusRef, (df) =>
    df.filter(pl.col("timestamp").gt(pl.lit(cutoffDate)))
  );

  // Remove analyzed markets older than 7 days
  const marketCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  yield* Ref.update(marketsRef, (df) =>
    df.filter(
      pl.col("analyzed").eq(pl.lit(false))
        .or(pl.col("last_trade_timestamp").gt(pl.lit(marketCutoff)))
    )
  );
});

// Schedule in main.ts
yield* pruneOldData.pipe(
  Effect.repeat(Schedule.spaced(Duration.hours(6))),
  Effect.fork
);
```

### Option B: Size-Based Pruning
Limit DataFrames to maximum row counts.

**Pros:**
- Predictable memory ceiling
- Simple logic

**Cons:**
- May lose recent data during high activity
- Doesn't consider data age

**Effort:** Small (1-2 hours)
**Risk:** Medium

### Option C: Migrate to SQLite
Use database with automatic indexing and better memory management.

**Pros:**
- Professional solution
- Better query performance
- Automatic memory management

**Cons:**
- Larger change
- Requires repository refactor first

**Effort:** Large (8-16 hours)
**Risk:** Medium

## Recommended Action

**Option A** - Time-based pruning. Quick fix for immediate memory concerns. Plan Option C for long-term scalability.

## Technical Details

**Affected Files:**
- `src/services/data/DataService.ts` - Add pruneOldData method
- `src/main.ts` - Schedule pruning task
- `src/config/constants.ts` - Add retention configuration

**New Configuration:**
```typescript
PREDICTIONS_RETENTION_DAYS: 30,
CONSENSUS_RETENTION_DAYS: 30,
MARKETS_RETENTION_DAYS: 7,
```

## Acceptance Criteria

- [ ] Pruning function removes data older than configured thresholds
- [ ] Pruning scheduled to run every 6 hours
- [ ] Memory usage stays bounded under continuous operation
- [ ] Logs show pruning activity
- [ ] Type check passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-18 | Created finding from performance review | Polars DataFrames in memory grow without bound |

## Resources

- Performance oracle analysis
- Memory profiling tools for Node.js/Bun
