# LOFN - Data Collector

Real-time Polymarket trade collector using Effect.ts with layered architecture. Pushes trades to Convex, triggers smart alerts and AI analysis.

## STRUCTURE

```
src/
├── main.ts           # Entry point - Effect program bootstrap
├── config/
│   ├── constants.ts  # MIN_TRADE_SIZE, ANALYSIS_TIERS, AI_CATEGORY_KEYWORDS
│   └── env.ts        # CONVEX_URL, CONVEX_DEPLOY_KEY
├── domain/
│   ├── market/       # Market types, filter predicates, AI filter
│   └── prediction/   # Prediction domain types
├── services/
│   ├── data/         # DataService (CSV) + ConvexDataService (backend)
│   └── polymarket/   # WebSocketService + HistoricalService
└── layers/           # AppLayers - Effect.ts layer composition
```

## WHERE TO LOOK

| Task                       | Location                                      |
| -------------------------- | --------------------------------------------- |
| Change trade filters       | `src/domain/market/filters.ts`                |
| Add market category filter | `src/domain/market/ai-filter.ts`              |
| Modify WebSocket handling  | `src/services/polymarket/WebSocketService.ts` |
| Change Convex mutations    | `src/services/data/ConvexDataService.ts`      |
| Adjust trade size tiers    | `src/config/constants.ts`                     |
| Modify layer composition   | `src/layers/AppLayers.ts`                     |

## EFFECT.TS PATTERNS

```typescript
// Service pattern - all services are Effect Context tags
const program = Effect.gen(function* () {
  const data = yield* DataService;
  yield* data.saveAll;
});

// Layer composition - DI via Layer.provideMerge
const AppLayer = Layer.provideMerge(
  ConvexDataLayer,
  Layer.provideMerge(DataLayer, FetchHttpClient.layer)
);

// Run with BunRuntime
BunRuntime.runMain(program.pipe(Effect.provide(AppLayer)));
```

## KEY SERVICES

| Service             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `DataService`       | Local CSV storage (backup), load/save/prune        |
| `ConvexDataService` | Push trades to Convex, trigger smart alerts + AI   |
| `WebSocketService`  | Connect to Polymarket WS, filter + forward trades  |
| `HistoricalService` | Fetch historical trades on startup                 |

## DATA FLOW

```
Polymarket WS → WebSocketService → Filter (domain/market)
                                        ↓
                    ┌───────────────────┼───────────────────┐
                    ↓                   ↓                   ↓
            DataService          trackTradePrice     checkContrarianWhale
            (CSV backup)         (price snapshots)   (vs AI consensus)
                    ↓                   ↓                   ↓
                    └───────────────────┼───────────────────┘
                                        ↓
                              ConvexDataService
                              ├── storeTrade()
                              └── Tiered AI trigger
```

## SMART TRIGGER INTEGRATION

On each whale trade, WebSocketService calls:
1. `trackTradePrice()` - Records price snapshot for movement detection
2. `checkContrarianWhale()` - Compares whale bet vs AI consensus

## TRADE SIZE TIERS

| Tier     | Size Range   | AI Analysis |
| -------- | ------------ | ----------- |
| Bronze   | $5K-$15K     | Store only  |
| Silver   | $15K-$50K    | 30m batch   |
| Gold     | $50K-$100K   | 30m batch   |
| Platinum | $100K+       | Immediate   |

## CRITICAL NOTES

- **Trade size is USD**: `DO NOT multiply by price` - the `size` field from Polymarket is already in USD
- **Data loss accepted**: Design accepts potential data loss during restarts to simplify architecture

## ENV VARS (apps/lofn/.env)

```bash
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-key
```
