# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-01
**Commit:** 129623c
**Branch:** main

## OVERVIEW

Polymarket prediction SaaS. Real-time trade collection via WebSocket, AI consensus analysis (Claude/GPT/Gemini swarm), smart trigger detection, Convex real-time database, React dashboard with subscription billing.

## STRUCTURE

```
hermes/
├── apps/
│   ├── lofn/           # Effect.ts data collector (WebSocket + smart triggers)
│   └── web/            # TanStack Start dashboard (React 19 + Convex)
├── packages/
│   └── backend/        # Convex serverless (queries, mutations, AI swarm, crons)
└── plans/              # Feature specs and architecture docs
```

## WHERE TO LOOK

| Task                      | Location                             | Notes                        |
| ------------------------- | ------------------------------------ | ---------------------------- |
| Add Convex table/function | `packages/backend/convex/`           | Schema in `schema.ts`        |
| Add dashboard page        | `apps/web/src/routes/dashboard/`     | TanStack file-based routing  |
| Add UI component          | `apps/web/src/components/ui/`        | shadcn/ui pattern            |
| Modify trade collection   | `apps/lofn/src/services/polymarket/` | WebSocket + smart triggers   |
| Add AI model              | `packages/backend/convex/ai/`        | Swarm orchestration          |
| Modify market filters     | `apps/lofn/src/domain/market/`       | Effect.ts predicates         |
| Add smart trigger logic   | `packages/backend/convex/smartTriggers.ts` | Detection algorithms   |
| Modify billing/features   | `apps/web/autumn.config.ts`          | Autumn.js feature gates      |

## TECH STACK

| Layer          | Tech                      | Notes                           |
| -------------- | ------------------------- | ------------------------------- |
| Runtime        | Bun                       | NOT Node.js - see anti-patterns |
| Data Collector | Effect.ts                 | Functional, layered services    |
| Backend        | Convex                    | Real-time DB + serverless       |
| Frontend       | TanStack Start + React 19 | SSR, file-based routing         |
| UI             | shadcn/ui + Tailwind v4   | Radix primitives                |
| AI             | Anthropic, OpenAI, Google | Multi-model consensus swarm     |
| Auth           | Better Auth + Convex      | OAuth providers                 |
| Billing        | Autumn.js                 | Feature gates, subscription tiers |
| Linting        | oxlint + oxfmt            | Rust-based (fast)               |

## CONVENTIONS

- **Bun everywhere**: `bun run`, `bun test`, `bun build` - never npm/yarn/pnpm
- **Effect.ts patterns**: Layers for DI, generators for async, tagged errors
- **Barrel exports**: Every module has `index.ts` re-exporting public API
- **Convex typing**: Always add explicit `returns` validator + handler return type
- **Workspace protocol**: Use `workspace:*` or `catalog:` for internal deps
- **Dashboard routes**: Use `-components/` directories for route-local components

## ANTI-PATTERNS (THIS PROJECT)

| Forbidden                        | Use Instead                   |
| -------------------------------- | ----------------------------- |
| `node`, `npm`, `pnpm`, `yarn`    | `bun`                         |
| `vite` CLI, `webpack`, `esbuild` | `bun build` or TanStack Start |
| `express`, `fastify`             | `Bun.serve()` or Convex       |
| `dotenv`                         | Bun auto-loads `.env`         |
| `jest`, `vitest`                 | `bun test`                    |
| `ws`, `ioredis`, `pg`            | Bun built-ins                 |
| `as any`, `@ts-ignore`           | Proper typing                 |
| Empty `catch {}` blocks          | Effect error handling         |
| ESLint, Prettier                 | oxlint, oxfmt                 |

## COMMANDS

```bash
# Development
bun run dev              # All workspaces
bun --cwd apps/lofn dev  # Data collector only
bun --cwd apps/web dev   # Dashboard only
bun --cwd packages/backend dev  # Convex dev server

# Build & Check
bun run build            # Build all
bun run check            # TypeScript check all
bun run lint             # oxlint
bun run format           # oxfmt

# Convex
cd packages/backend
bun run setup            # First-time setup
bun run typecheck        # Type check Convex functions
```

## ENV VARS

```bash
# Lofn (apps/lofn/.env)
CONVEX_URL=              # Convex deployment URL
CONVEX_DEPLOY_KEY=       # For internal mutations

# Convex Dashboard (set in Convex)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
```

## DATA FLOW

```
Polymarket WebSocket
        │
        ▼
   lofn (Effect.ts)
   ├── Filter trades (size, price, category)
   ├── Track prices → Smart Triggers
   ├── Store locally (CSV backup)
   └── Push to Convex ───────────────────┐
                                         │
                                         ▼
                              Convex Backend
                              ├── trades table
                              ├── Whale detection (tiered)
                              ├── Smart Triggers
                              │   ├── Price movements (10%+ in 4h)
                              │   ├── Contrarian whales
                              │   └── Resolution proximity
                              └── AI Signal trigger
                                         │
                                         ▼
                              AI Swarm (3 models)
                              ├── Claude claude-sonnet-4-20250514
                              ├── GPT-4o
                              └── Gemini 1.5 Pro
                                         │
                                         ▼
                              Consensus → signals table
                                         │
                                         ▼
                              React Dashboard (real-time)
                              ├── Signals feed
                              ├── Smart Alerts
                              └── Performance metrics
```

## TIERED ANALYSIS

| Tier     | Trade Size    | AI Analysis     | Timing     |
| -------- | ------------- | --------------- | ---------- |
| Bronze   | $5K-$15K      | None (store)    | -          |
| Silver   | $15K-$50K     | Full swarm      | 30m batch  |
| Gold     | $50K-$100K    | Full swarm      | 30m batch  |
| Platinum | $100K+        | Full swarm      | Immediate  |

## NOTES

- **No CI yet**: `.github/workflows/` empty - run checks locally via Husky pre-commit
- **Tests sparse**: Infrastructure ready (Vitest/Bun) but no test files
- **Plans dir**: Architecture decisions and feature specs live in `/plans`
- **Monorepo name**: Internal name is "hermes", apps/lofn is the main agent
- **Large files**: `landing-page.tsx` (1649 lines), `analysis.ts` (1257 lines) are complexity hotspots
