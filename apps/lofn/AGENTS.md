# LOFN - Data Collector

Real-time Polymarket trade collector using Effect.ts with layered architecture.

## STRUCTURE

```
src/
├── main.ts           # Entry point - Effect program bootstrap
├── config/           # Constants (MIN_TRADE_SIZE) + env vars (CONVEX_URL)
├── domain/
│   ├── market/       # Market types, filter predicates, AI filter
│   └── prediction/   # Prediction domain types
├── services/
│   ├── data/         # DataService (CSV) + ConvexDataService (backend)
│   └── polymarket/   # WebSocketService + HistoricalService
└── layers/           # AppLayers - Effect.ts layer composition
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Change trade filters | `src/domain/market/filters.ts` |
| Add new market filter | `src/domain/market/ai-filter.ts` |
| Modify WebSocket handling | `src/services/polymarket/WebSocketService.ts` |
| Change Convex mutations | `src/services/data/ConvexDataService.ts` |
| Adjust constants | `src/config/constants.ts` |
| Modify layer composition | `src/layers/AppLayers.ts` |

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

| Service | Purpose |
|---------|---------|
| `DataService` | Local CSV storage (backup), load/save/prune |
| `ConvexDataService` | Push trades to Convex, triggers AI analysis |
| `WebSocketService` | Connect to Polymarket WS, filter + forward trades |
| `HistoricalService` | Fetch historical trades on startup |

## DATA FLOW

```
Polymarket WS → WebSocketService → Filter (domain/market)
                                        ↓
                          DataService (CSV backup)
                                        ↓
                          ConvexDataService → Convex Backend
```

## ENV VARS (apps/lofn/.env)

```bash
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-key
```
