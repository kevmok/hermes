---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, performance, parallelization]
dependencies: []
---

# Sequential AI Analysis Loop Prevents Parallelization

## Problem Statement

Markets are analyzed sequentially in a for loop, despite each analysis being independent. With 3 markets and 3 models (120s timeout each), worst case is 360 seconds. This wastes time when markets could be analyzed in parallel.

**Why it matters:** At 10x scale (30 markets), analysis could take 5-10 minutes instead of ~60-120 seconds with parallelization.

## Findings

**Location:** `src/services/analysis/AnalysisService.ts:162-199`

```typescript
for (let i = 0; i < rows.length; i++) {
  const market = rows[i]!;
  // ...
  const response = yield* swarm.query(systemPrompt, userPrompt);  // Sequential
  // ...
}
```

**Current Impact:** 3 markets \* ~10-20s per market = 30-60s total
**With Parallelization:** All 3 markets at once = ~10-20s total (3-5x faster)

## Proposed Solutions

### Option A: Parallel with Bounded Concurrency (Recommended)

Process markets in parallel with concurrency limit.

**Effort:** Small (1-2 hours)
**Risk:** Low

```typescript
const results = yield* Effect.all(
  rows.map((market, i) =>
    Effect.gen(function* () {
      const response = yield* swarm.query(systemPrompt, userPrompt);
      yield* savePredictions(predictionsRef, runId, market, response);
      return { market, response, rank: i + 1 };
    })
  ),
  { concurrency: 5 }  // Process 5 markets concurrently
);
```

## Recommended Action

**Option A** - Parallelize with bounded concurrency. Respects rate limits while improving throughput.

## Acceptance Criteria

- [ ] Markets analyzed in parallel with configurable concurrency
- [ ] Results collected and processed correctly
- [ ] Performance improved 3-5x for multi-market analysis
- [ ] Rate limits still respected
