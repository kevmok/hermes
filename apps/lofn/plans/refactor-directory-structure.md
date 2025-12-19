# refactor: Reorganize Project Directory Structure

## Overview

Reorganize the flat `src/` directory into a well-structured, domain-driven layout following Effect.ts and 2025 TypeScript best practices.

## Current State (11 files in flat src/)

```
src/
├── analysis.ts      # Market analysis workflow
├── config.ts        # Configuration constants
├── data.ts          # Polars data persistence
├── env.ts           # Environment validation
├── filters.ts       # Trade filtering logic
├── historical.ts    # Historical data fetching
├── main.ts          # Entry point
├── models.ts        # AI model layers
├── prompt.ts        # AI prompts
├── status.ts        # Status reporting
├── swarm.ts         # Multi-model consensus
├── types.ts         # Schema definitions
└── websocket.ts     # WebSocket client
```

## Proposed Structure

```
src/
├── main.ts                           # Entry point (keep at root)
│
├── config/                           # Configuration & environment
│   ├── index.ts                      # Re-exports
│   ├── constants.ts                  # From config.ts
│   └── env.ts                        # From env.ts
│
├── domain/                           # Core business logic
│   ├── market/
│   │   ├── index.ts
│   │   ├── types.ts                  # Market-related types from types.ts
│   │   └── filters.ts                # From filters.ts
│   └── prediction/
│       ├── index.ts
│       └── types.ts                  # Prediction types from types.ts
│
├── services/                         # Effect services
│   ├── ai/
│   │   ├── index.ts                  # Re-exports all AI services
│   │   ├── models.ts                 # From models.ts (layer definitions)
│   │   ├── swarm.ts                  # From swarm.ts (SwarmService)
│   │   └── prompts.ts                # From prompt.ts
│   ├── data/
│   │   ├── index.ts
│   │   └── DataService.ts            # From data.ts
│   ├── polymarket/
│   │   ├── index.ts
│   │   ├── WebSocketService.ts       # From websocket.ts
│   │   └── HistoricalService.ts      # From historical.ts
│   └── analysis/
│       ├── index.ts
│       ├── AnalysisService.ts        # From analysis.ts
│       └── StatusService.ts          # From status.ts
│
└── layers/                           # Layer composition
    └── AppLayers.ts                  # Compose all service layers
```

## Migration Plan

### Phase 1: Create Directory Structure

```bash
mkdir -p src/config
mkdir -p src/domain/market
mkdir -p src/domain/prediction
mkdir -p src/services/ai
mkdir -p src/services/data
mkdir -p src/services/polymarket
mkdir -p src/services/analysis
mkdir -p src/layers
```

### Phase 2: Move & Rename Files

| Old Location        | New Location                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `src/config.ts`     | `src/config/constants.ts`                                               |
| `src/env.ts`        | `src/config/env.ts`                                                     |
| `src/types.ts`      | Split → `src/domain/market/types.ts` + `src/domain/prediction/types.ts` |
| `src/filters.ts`    | `src/domain/market/filters.ts`                                          |
| `src/models.ts`     | `src/services/ai/models.ts`                                             |
| `src/swarm.ts`      | `src/services/ai/swarm.ts`                                              |
| `src/prompt.ts`     | `src/services/ai/prompts.ts`                                            |
| `src/data.ts`       | `src/services/data/DataService.ts`                                      |
| `src/websocket.ts`  | `src/services/polymarket/WebSocketService.ts`                           |
| `src/historical.ts` | `src/services/polymarket/HistoricalService.ts`                          |
| `src/analysis.ts`   | `src/services/analysis/AnalysisService.ts`                              |
| `src/status.ts`     | `src/services/analysis/StatusService.ts`                                |

### Phase 3: Create Index Files (Re-exports)

**src/config/index.ts:**

```typescript
export * from "./constants";
export * from "./env";
```

**src/services/ai/index.ts:**

```typescript
export * from "./models";
export * from "./swarm";
export * from "./prompts";
```

### Phase 4: Update Imports

Update all import paths in moved files to reflect new locations.

### Phase 5: Create AppLayers.ts

**src/layers/AppLayers.ts:**

```typescript
import { Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { PrimaryModelLayer } from "../services/ai/models";
import { SwarmLayer } from "../services/ai/swarm";
import { DataLayer } from "../services/data/DataService";

export const AppLayer = Layer.provideMerge(
  PrimaryModelLayer,
  Layer.provideMerge(
    SwarmLayer,
    Layer.provideMerge(DataLayer, FetchHttpClient.layer)
  )
);
```

## Acceptance Criteria

- [ ] All files moved to new locations
- [ ] All imports updated to use new paths
- [ ] Index files created for clean re-exports
- [ ] `main.ts` uses `AppLayers.ts` for layer composition
- [ ] Type check passes (`bunx tsc --noEmit`)
- [ ] Application runs successfully (`bun run index.ts`)

## Benefits

1. **Clarity** - Clear separation of config, domain, services, layers
2. **Scalability** - Easy to add new services/domains
3. **Effect.ts conventions** - Services grouped by capability, layers composed centrally
4. **Discoverability** - Index files provide clean public APIs
5. **Testability** - Domain logic isolated, services mockable via layers
