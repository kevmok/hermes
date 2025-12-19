---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, patterns, duplication]
dependencies: []
---

# Repetitive CSV Loading Logic in DataService

## Problem Statement

The `loadData` function has three nearly identical blocks for loading CSV files (~55 lines). This violates DRY and makes maintenance harder.

## Findings

**Location:** `src/services/data/DataService.ts:76-122`

Same pattern repeated 3 times:
```typescript
const marketsPath = `${CONFIG.DATA_FOLDER}/markets.csv`;
const marketsExists = yield* Effect.tryPromise(() =>
  fs.access(marketsPath).then(() => true).catch(() => false)
);
if (marketsExists) {
  yield* Effect.try(() => {
    const df = pl.readCSV(marketsPath);
    return Ref.set(marketsRef, df);
  }).pipe(
    Effect.flatMap((effect) => effect),
    Effect.catchAll(() => Effect.void)
  );
}
// ... repeated for predictions and consensus
```

## Proposed Solution

Extract to reusable helper:

```typescript
const loadCSV = (filename: string, ref: Ref.Ref<pl.DataFrame>) =>
  Effect.gen(function* () {
    const path = `${CONFIG.DATA_FOLDER}/${filename}`;
    const exists = yield* Effect.tryPromise(() =>
      fs.access(path).then(() => true).catch(() => false)
    );
    if (exists) {
      yield* Effect.try(() => Ref.set(ref, pl.readCSV(path)))
        .pipe(Effect.flatMap(e => e), Effect.catchAll(() => Effect.void));
    }
  });

const loadData = Effect.gen(function* () {
  yield* Effect.tryPromise(() => fs.mkdir(CONFIG.DATA_FOLDER, { recursive: true }));
  yield* Effect.all([
    loadCSV("markets.csv", marketsRef),
    loadCSV("predictions.csv", predictionsRef),
    loadCSV("consensus_picks.csv", consensusRef),
  ]);
  console.log("Data loaded successfully");
});
```

**Effort:** Small (1 hour)
**Risk:** Very Low

## Acceptance Criteria

- [ ] Single reusable CSV loading function
- [ ] ~30 lines reduced from DataService
- [ ] Same functionality preserved
