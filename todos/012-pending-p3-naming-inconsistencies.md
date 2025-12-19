---
status: pending
priority: p3
issue_id: "012"
tags: [code-review, patterns, naming]
dependencies: []
---

# Inconsistent Effect Export Naming Conventions

## Problem Statement

Effect exports have inconsistent naming patterns, reducing code readability.

## Findings

**Current Inconsistencies:**
- `analysisTask` (camelCase, no suffix)
- `statusReportingEffect` (includes "Effect" suffix)
- `websocketEffect` (includes "Effect" suffix)
- `fetchHistoricalTrades` (imperative verb, no suffix)

**Layer Naming:**
- `DataLayer`, `SwarmLayer` (singular + Layer)
- `AppLayers` (plural)

## Proposed Solution

Standardize on one pattern:
- Effects: camelCase without suffix (`analysisTask`, `statusReporting`, `websocket`, `fetchHistoricalTrades`)
- Layers: singular + Layer suffix (`DataLayer`, `SwarmLayer`, `AppLayer`)

**Effort:** Small (30 minutes)
**Risk:** Very Low

## Acceptance Criteria

- [ ] All Effect exports follow consistent naming
- [ ] All Layer exports follow consistent naming
- [ ] Imports updated across codebase
