---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, data-integrity, transactions]
dependencies: []
---

# No Atomicity Between Multiple DataFrame Updates in Analysis

## Problem Statement

If the process crashes after saving predictions but before marking markets as analyzed, those markets will be analyzed again on restart, creating duplicate predictions.

**Why it matters:** Data duplication and potential inconsistency between markets and predictions DataFrames.

## Findings

**Location:** `src/services/analysis/AnalysisService.ts:192-229`

**Scenario:**
```
1. Save predictions to predictionsRef (line 192) - SUCCESS
2. Save consensus picks to consensusRef (line 202) - SUCCESS
3. [CRASH HERE]
4. Mark markets as analyzed (lines 220-229) - NEVER EXECUTED
5. On restart: Same markets are analyzed again, duplicate predictions created
```

## Proposed Solutions

### Option A: Pre-Mark with Rollback (Recommended)
Mark markets as analyzed BEFORE analysis, rollback on failure.

**Effort:** Medium (2-3 hours)
**Risk:** Low

```typescript
// PRE-MARK as analyzed
yield* Ref.update(marketsRef, (df) => {
  return df.withColumns(
    pl.when(pl.col("market_id").isIn(analyzedIds))
      .then(pl.lit(true))
      .otherwise(pl.col("analyzed"))
      .alias("analyzed"),
  );
});
yield* data.saveAll;  // Persist immediately

// Use acquireRelease for rollback
yield* Effect.acquireUseRelease(
  Effect.succeed(analyzedIds),
  (ids) => performAnalysis(ids),
  (ids, exit) => {
    if (exit._tag === "Failure") {
      return unmarkAsAnalyzed(ids);
    }
    return Effect.void;
  }
);
```

### Option B: Idempotent Analysis
Track run_id and skip already-analyzed markets.

**Effort:** Medium (3-4 hours)
**Risk:** Low

## Recommended Action

**Option A** - Pre-mark with rollback provides proper transaction semantics.

## Acceptance Criteria

- [ ] Markets marked as analyzed before analysis starts
- [ ] On failure, markets unmarked (rollback)
- [ ] No duplicate predictions possible
- [ ] Type check passes
