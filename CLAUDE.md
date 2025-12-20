---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests..

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Monorepo Structure

This is a Bun workspaces monorepo called "hermes".

```
hermes/
├── apps/
│   └── lofn/           # Polymarket prediction agent
├── packages/           # Shared libraries (future)
├── package.json        # Root workspace config
├── bunfig.toml         # Bun workspace settings
└── tsconfig.base.json  # Shared TypeScript config
```

### Running Commands

```bash
# From root - run lofn app
bun run dev              # Uses root script
bun --cwd apps/lofn dev  # Direct workspace command

# Install dependencies
bun install              # Installs all workspaces

# Add dependency to specific workspace
bun add package --cwd apps/lofn

# Run type check across all workspaces
bun run check
```

### Workspace Protocol

When referencing internal packages, use `workspace:*`:

```json
{
  "dependencies": {
    "@hermes/shared": "workspace:*"
  }
}
```

---

## Convex Backend Architecture

The backend uses [Convex](https://convex.dev) as a real-time database and serverless functions platform. Located in `packages/backend/`.

### Running the Backend

```bash
cd packages/backend
bun run dev      # Start Convex dev server (watches for changes)
bun run setup    # First-time setup (creates tables)
bun run typecheck # Type check Convex functions
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Future)                              │
│                    React + Convex React Hooks                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Convex Backend                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Queries   │  │  Mutations  │  │   Actions   │  │    Crons    │    │
│  │ (Real-time) │  │  (Writes)   │  │ (External)  │  │ (Scheduled) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│  ┌────────────────────────────────┴────────────────────────────────┐    │
│  │                     Convex Database Tables                       │    │
│  │  markets │ marketSnapshots │ insights │ modelPredictions        │    │
│  │  analysisRuns │ analysisRequests │ watchlists                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Lofn Data Collector (apps/lofn)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ WebSocket Feed  │──│  Market Filter  │──│ Convex Mutations│         │
│  │  (Polymarket)   │  │   (Effect.ts)   │  │    (Write)      │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Schema (7 Tables)

#### `markets` - Polymarket data

Stores market information from Polymarket with real-time price updates.

| Field           | Type    | Description                     |
| --------------- | ------- | ------------------------------- |
| polymarketId    | string  | External Polymarket ID (unique) |
| conditionId     | string? | Trading condition ID            |
| eventSlug       | string  | URL slug for the event          |
| title           | string  | Market question/title           |
| currentYesPrice | number  | Current YES price (0-1)         |
| currentNoPrice  | number  | Current NO price (0-1)          |
| volume24h       | number  | 24-hour trading volume          |
| totalVolume     | number  | All-time volume                 |
| isActive        | boolean | Whether market is tradeable     |
| lastAnalyzedAt  | number? | Timestamp of last AI analysis   |

**Indexes:** `by_polymarket_id`, `by_active`, `by_volume`, `by_category`, `by_last_trade`

#### `marketSnapshots` - Price history

Captures periodic snapshots for charting and analysis.

| Field     | Type          | Description             |
| --------- | ------------- | ----------------------- |
| marketId  | Id<"markets"> | Reference to market     |
| yesPrice  | number        | YES price at snapshot   |
| noPrice   | number        | NO price at snapshot    |
| volume    | number        | Volume at snapshot      |
| timestamp | number        | When snapshot was taken |

#### `analysisRuns` - Batch analysis tracking

Tracks each analysis batch (scheduled or on-demand).

| Field           | Type                                              | Description                           |
| --------------- | ------------------------------------------------- | ------------------------------------- |
| runId           | string                                            | Human-readable ID like "run_1234_abc" |
| triggerType     | "scheduled" \| "on_demand" \| "system"            | What triggered the run                |
| status          | "pending" \| "running" \| "completed" \| "failed" | Current state                         |
| marketsAnalyzed | number                                            | Count of markets processed            |
| errorMessage    | string?                                           | Error if failed                       |

#### `modelPredictions` - Individual AI responses

Stores each AI model's prediction for a market.

| Field          | Type                        | Description                                   |
| -------------- | --------------------------- | --------------------------------------------- |
| analysisRunId  | Id<"analysisRuns">          | Which run this belongs to                     |
| marketId       | Id<"markets">               | Market being analyzed                         |
| modelName      | string                      | "claude-sonnet-4", "gpt-4o", "gemini-1.5-pro" |
| decision       | "YES" \| "NO" \| "NO_TRADE" | Model's recommendation                        |
| reasoning      | string                      | Explanation for decision                      |
| responseTimeMs | number                      | How long the API call took                    |
| confidence     | number?                     | 0-100 confidence score                        |

#### `insights` - Consensus results

Aggregated consensus from multiple AI models.

| Field               | Type                        | Description                    |
| ------------------- | --------------------------- | ------------------------------ |
| analysisRunId       | Id<"analysisRuns">          | Which run produced this        |
| marketId            | Id<"markets">               | Market analyzed                |
| consensusDecision   | "YES" \| "NO" \| "NO_TRADE" | Majority vote                  |
| consensusPercentage | number                      | % of models agreeing           |
| totalModels         | number                      | How many models voted          |
| agreeingModels      | number                      | How many agreed with consensus |
| aggregatedReasoning | string                      | Combined reasoning             |
| confidenceLevel     | "high" \| "medium" \| "low" | >=80% high, >=60% medium       |
| isHighConfidence    | boolean                     | True if >=66% consensus        |
| priceAtAnalysis     | number                      | Market price when analyzed     |

#### `analysisRequests` - On-demand queue

Tracks user-requested analyses.

| Field        | Type                                                 | Description           |
| ------------ | ---------------------------------------------------- | --------------------- |
| marketId     | Id<"markets">                                        | Market to analyze     |
| status       | "pending" \| "processing" \| "completed" \| "failed" | Request state         |
| insightId    | Id<"insights">?                                      | Result when completed |
| errorMessage | string?                                              | Error if failed       |

#### `watchlists` & `watchlistItems` - User tracking

Allows organizing markets into named lists.

### Convex Function Types

Convex has 4 types of functions:

1. **Queries** (`query`) - Read-only, real-time reactive
   - Automatically re-run when data changes
   - Used by frontend for live updates
   - Example: `listActiveMarkets`, `getLatestInsights`

2. **Mutations** (`mutation`) - Write operations
   - Transactional database writes
   - Example: `requestMarketAnalysis`, `addToWatchlist`

3. **Actions** (`action`) - External API calls
   - Can call external services (AI providers, HTTP)
   - Can call mutations/queries via `ctx.runMutation`/`ctx.runQuery`
   - Example: `executeMarketAnalysis` (calls AI APIs)

4. **Internal Functions** (`internalQuery`, `internalMutation`, `internalAction`)
   - Not exposed to clients
   - Called by other functions or scheduled jobs
   - Example: `upsertMarket`, `saveInsight`

### Key Files

```
packages/backend/convex/
├── schema.ts          # Database schema definition
├── markets.ts         # Market CRUD operations
├── analysis.ts        # AI analysis orchestration
├── insights.ts        # Insight queries
├── watchlists.ts      # Watchlist management
├── crons.ts           # Scheduled job definitions
└── scheduledJobs.ts   # Job implementations
```

### How Analysis Works

1. **Trigger** - Either scheduled (every 30 min) or on-demand via `requestMarketAnalysis`

2. **Market Selection** - `getMarketsNeedingAnalysis` finds active markets not analyzed in 6+ hours, sorted by volume

3. **Analysis Run Created** - `createAnalysisRun` creates a tracking record

4. **AI Calls** - `executeMarketAnalysis` (action) calls AI providers in parallel:
   - Claude (Anthropic)
   - GPT-4o (OpenAI)
   - Gemini (Google)

5. **Save Predictions** - Each model's response saved to `modelPredictions`

6. **Calculate Consensus** - Majority vote determines consensus decision

7. **Save Insight** - Final result stored in `insights` with confidence level

8. **Mark Analyzed** - Market's `lastAnalyzedAt` updated to prevent re-analysis

### Typing Internal Functions

When internal functions reference each other, TypeScript needs explicit types to avoid circular inference:

```typescript
// BAD - causes "implicitly has type 'any'" error
export const myAction = internalAction({
  args: { id: v.id('markets') },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(internal.other.mutation, {});
    return result;
  },
});

// GOOD - explicit types break the cycle
export const myAction = internalAction({
  args: { id: v.id('markets') },
  returns: v.object({ success: v.boolean() }),  // Add returns validator
  handler: async (ctx, args): Promise<{ success: boolean }> => {  // Add return type
    const result: Id<'markets'> = await ctx.runMutation(  // Type the variable
      internal.other.mutation,
      {}
    );
    return { success: true };
  },
});
```

### Using from Lofn App (Effect.ts)

The `ConvexDataService` in `apps/lofn/src/services/data/ConvexDataService.ts` provides an Effect.ts interface:

```typescript
import { ConvexDataService, ConvexDataLayer } from './services/data';
import { Effect } from 'effect';

// Use the service
const program = Effect.gen(function* () {
  const convex = yield* ConvexDataService;

  // Upsert a market
  const marketId = yield* convex.upsertMarket({
    polymarketId: '0x123...',
    eventSlug: 'will-x-happen',
    title: 'Will X happen?',
    currentYesPrice: 0.65,
    currentNoPrice: 0.35,
    volume24h: 100000,
    totalVolume: 5000000,
    isActive: true,
  });

  // Record a price snapshot
  yield* convex.recordSnapshot(marketId, 0.65, 0.35, 100000);

  // Get markets needing analysis
  const markets = yield* convex.getMarketsForAnalysis(10);
});

// Run with the layer
Effect.runPromise(program.pipe(Effect.provide(ConvexDataLayer)));
```

### Environment Variables

```bash
# Required for ConvexDataService
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-deploy-key  # For internal mutations

# Required in Convex dashboard for AI analysis
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### Scheduled Jobs

Defined in `crons.ts`:

1. **Automatic Analysis** (every 30 minutes)
   - Runs `runAutomaticAnalysis`
   - Analyzes top 10 markets by volume not analyzed in 6+ hours

2. **Data Cleanup** (daily at 4 AM UTC)
   - Runs `cleanupOldData`
   - Deletes snapshots older than 7 days
   - Deletes predictions older than 30 days
   - Deletes completed/failed requests older than 7 days
