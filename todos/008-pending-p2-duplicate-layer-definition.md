---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, patterns, duplication]
dependencies: []
---

# Duplicate Layer Composition in main.ts and AppLayers.ts

## Problem Statement

The exact same `AppLayer` composition exists in two places: `main.ts:70-76` and `layers/AppLayers.ts:7-13`. This violates DRY and creates maintenance risk.

**Why it matters:** Changes to layer composition must be made in two places. Easy to miss one and create inconsistency.

## Findings

**Location 1:** `src/main.ts:70-76`
**Location 2:** `src/layers/AppLayers.ts:7-13`

Both contain:
```typescript
const AppLayer = Layer.provideMerge(
  PrimaryModelLayer,
  Layer.provideMerge(
    SwarmLayer,
    Layer.provideMerge(DataLayer, FetchHttpClient.layer)
  )
);
```

## Proposed Solutions

### Option A: Delete layers/ folder (Recommended)
Keep layer composition only in main.ts. Delete the layers/ folder.

**Effort:** Small (15 minutes)
**Risk:** Very Low

### Option B: Import from AppLayers
Remove duplication in main.ts, import from layers/.

**Effort:** Small (15 minutes)
**Risk:** Very Low

## Recommended Action

**Option A** - The layers/ folder adds no value. Delete it entirely.

## Acceptance Criteria

- [ ] Only one layer composition exists
- [ ] No duplicate code
- [ ] Type check passes
