---
status: pending
priority: p3
issue_id: "014"
tags: [code-review, patterns, simplification]
dependencies: []
---

# Unnecessary Barrel Export Files

## Problem Statement

Single-line barrel exports add cognitive overhead and file navigation complexity for no benefit.

## Findings

**Barrel files with minimal exports:**
- `src/config/index.ts` - re-exports 2 files
- `src/services/data/index.ts` - re-exports 1 file
- `src/domain/market/index.ts` - re-exports 2 files
- `src/domain/prediction/index.ts` - re-exports 1 file
- `src/layers/index.ts` - re-exports 1 file

## Proposed Solution

Option A: Delete barrel exports, import directly from source files.

Option B: Keep barrels for consistency, but this is a stylistic choice.

**Effort:** Small (30 minutes)
**Risk:** Very Low

## Acceptance Criteria

- [ ] Decide on barrel export strategy
- [ ] Apply consistently across codebase
