---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, patterns, dead-code]
dependencies: []
---

# Unused Schema.Class Definitions in Domain Types

## Problem Statement

`Schema.Class` definitions are defined but never used for validation. The code uses plain interfaces instead, creating confusion about which types are authoritative.

**Why it matters:** Dead code creates confusion. Developers may think schemas are being used for validation when they're not.

## Findings

**Unused Schema Classes:**

- `src/domain/market/types.ts:3-14` - `MarketRow` class (never used)
- `src/domain/prediction/types.ts:3-14` - `IndividualPrediction` class (never used)
- `src/domain/prediction/types.ts:16-29` - `ConsensusPick` class (never used)

**Evidence:** Grep for class names shows only definitions, no usages.

**Also Unused:**

- `src/config/env.ts:13-37` - `validateEnv` function never called
- `src/services/ai/prompts.ts:8` - `CONSENSUS_AI_PROMPT` never used

## Proposed Solutions

### Option A: Delete Unused Code (Recommended)

Remove Schema.Class definitions, keep only plain interfaces.

**Effort:** Small (30 minutes)
**Risk:** Very Low

### Option B: Use Schemas for Validation

Actually use the schemas for runtime validation.

**Effort:** Medium (4-6 hours)
**Risk:** Low

## Recommended Action

**Option A** - Delete dead code. If validation is needed later, can add it properly.

## Acceptance Criteria

- [ ] Unused Schema.Class definitions removed
- [ ] Unused functions removed (validateEnv, CONSENSUS_AI_PROMPT)
- [ ] Only used code remains
- [ ] Type check passes
