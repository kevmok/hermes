---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, data-integrity, csv]
dependencies: []
---

# CSV Format Loses Type Information (Boolean Fields)

## Problem Statement

CSV format doesn't preserve type information. Boolean fields like `analyzed` may be read back as strings ("true"/"false"), causing filter failures where `pl.col("analyzed").eq(pl.lit(false))` never matches string "false".

**Why it matters:** After restart, markets that should be unanalyzed may appear analyzed (or vice versa), causing either duplicate analysis or skipped markets.

## Findings

**Location:** `src/services/data/DataService.ts:83-121` (load operations)

**Scenario:**

```
Write: analyzed = true (boolean)
CSV stores: "true" (string)
Read back: analyzed = "true" (string, NOT boolean!)
Filter fails: pl.col("analyzed").eq(pl.lit(false)) never matches
```

**Evidence:** No type casting after CSV read. Polars `readCSV` infers types which may differ from original.

## Proposed Solutions

### Option A: Explicit Type Casting on Load (Recommended)

Cast columns to correct types after reading CSV.

**Effort:** Small (1-2 hours)
**Risk:** Low

```typescript
if (marketsExists) {
  let df = pl.readCSV(marketsPath);
  df = df.withColumns(
    pl.when(pl.col("analyzed").eq(pl.lit("true")).or(pl.col("analyzed").eq(pl.lit(true))))
      .then(pl.lit(true))
      .otherwise(pl.lit(false))
      .alias("analyzed"),
  );
  yield* Ref.set(marketsRef, df);
}
```

### Option B: Switch to Parquet Format

Use Parquet instead of CSV for type preservation.

**Effort:** Small (2-3 hours)
**Risk:** Low

## Recommended Action

**Option A** for quick fix. Consider **Option B** as part of larger refactor.

## Acceptance Criteria

- [ ] Boolean columns correctly typed after CSV load
- [ ] Filtering on `analyzed` field works after restart
- [ ] Type check passes
