# feat: Scalable AI Analysis Architecture (Simplified)

**Created:** 2025-12-19
**Status:** Ready for Implementation
**Category:** Architecture / Enhancement

---

## Overview

Move AI analysis from lofn into Convex. Keep it simple.

**Key Decisions:**

1. Lofn = pure collector
2. Convex = database + analysis (triggered on market upsert)
3. `@effect/ai` = use the existing packages (already installed in backend)
4. Port existing lofn swarm code with minimal changes

---

## The Simple Flow

```
Polymarket WS → lofn filters → Convex upsertMarket → schedules analyzeMarket
                                                            ↓
                                              @effect/ai swarm (parallel AI calls)
                                                            ↓
                                                    Save insight directly
```

---

## Already Installed in Backend

```json
{
  "dependencies": {
    "@effect/ai": "^0.33.0",
    "@effect/ai-anthropic": "^0.23.0",
    "@effect/ai-google": "^0.12.0",
    "@effect/ai-openai": "^0.37.0",
    "effect": "^3.19.13"
  }
}
```

---

## Phase 1: Port Swarm to Convex

### 1.1 Create AI Models Layer

**File:** `packages/backend/convex/ai/models.ts`

Port from `apps/lofn/src/services/ai/models.ts`:

```typescript
import { Layer } from 'effect';
import * as Redacted from 'effect/Redacted';
import { LanguageModel } from '@effect/ai';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { GoogleClient, GoogleLanguageModel } from '@effect/ai-google';
import { FetchHttpClient } from '@effect/platform';

// Note: In Convex, use process.env instead of bun.env

// OpenAI Client and Language Model
const OpenAiClientLayer = OpenAiClient.layer({
  apiKey: process.env.OPENAI_API_KEY
    ? Redacted.make(process.env.OPENAI_API_KEY)
    : undefined,
});

const OpenAiModelLayer = OpenAiLanguageModel.layer({
  model: 'gpt-4o',
});

// Anthropic Client and Language Model
const AnthropicClientLayer = AnthropicClient.layer({
  apiKey: process.env.ANTHROPIC_API_KEY
    ? Redacted.make(process.env.ANTHROPIC_API_KEY)
    : undefined,
});

const AnthropicModelLayer = AnthropicLanguageModel.layer({
  model: 'claude-sonnet-4-20250514',
});

// Google Client and Language Model
const GoogleClientLayer = GoogleClient.layer({
  apiKey: process.env.GOOGLE_API_KEY
    ? Redacted.make(process.env.GOOGLE_API_KEY)
    : undefined,
});

const GoogleModelLayer = GoogleLanguageModel.layer({
  model: 'gemini-1.5-pro',
});

// Combined layers with FetchHttpClient
export const AnthropicLayer = Layer.provideMerge(
  AnthropicModelLayer,
  AnthropicClientLayer,
).pipe(Layer.provide(FetchHttpClient.layer));

export const OpenAiLayer = Layer.provideMerge(
  OpenAiModelLayer,
  OpenAiClientLayer,
).pipe(Layer.provide(FetchHttpClient.layer));

export const GoogleLayer = Layer.provideMerge(
  GoogleModelLayer,
  GoogleClientLayer,
).pipe(Layer.provide(FetchHttpClient.layer));

export { LanguageModel };
```

### 1.2 Create Swarm Service

**File:** `packages/backend/convex/ai/swarm.ts`

Port from `apps/lofn/src/services/ai/swarm.ts`:

```typescript
import { LanguageModel } from '@effect/ai';
import { Duration, Effect, Layer, Schedule } from 'effect';
import { AnthropicLayer, OpenAiLayer, GoogleLayer } from './models';

// Types
export interface SwarmResult {
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  reasoning: string;
  responseTimeMs: number;
  error?: string;
}

export interface SwarmResponse {
  results: SwarmResult[];
  consensusDecision: 'YES' | 'NO' | 'NO_TRADE';
  consensusPercentage: number;
  totalModels: number;
  successfulModels: number;
}

// System prompt for market analysis
const SYSTEM_PROMPT = `You are an expert prediction market analyst.
For this market, decide whether YES is undervalued, NO is undervalued, or there's no clear edge.
Respond ONLY with JSON: {"decision": "YES|NO|NO_TRADE", "reasoning": "your brief reasoning"}`;

// Build user prompt from market data
export const buildPrompt = (market: {
  title: string;
  currentYesPrice: number;
  eventSlug: string;
}): string =>
  `Market: "${market.title}"
Current YES price: ${(market.currentYesPrice * 100).toFixed(1)}%
Event: ${market.eventSlug}

Should you buy YES, buy NO, or not trade?`;

// Parse decision from model response text
const parseDecision = (text: string): 'YES' | 'NO' | 'NO_TRADE' => {
  const upper = text.toUpperCase();
  if (
    upper.includes('"YES"') ||
    upper.includes('DECISION: YES') ||
    upper.includes('"DECISION":"YES"') ||
    upper.includes('"DECISION": "YES"')
  ) {
    return 'YES';
  }
  if (
    upper.includes('"NO"') ||
    upper.includes('DECISION: NO') ||
    upper.includes('"DECISION":"NO"') ||
    upper.includes('"DECISION": "NO"')
  ) {
    // Make sure it's not "NO_TRADE"
    if (!upper.includes('NO_TRADE')) {
      return 'NO';
    }
  }
  return 'NO_TRADE';
};

// Calculate consensus from results
export const calculateConsensus = (results: SwarmResult[]): SwarmResponse => {
  const successfulResults = results.filter((r) => !r.error);
  const tradingResults = successfulResults.filter(
    (r) => r.decision !== 'NO_TRADE',
  );

  let consensusDecision: 'YES' | 'NO' | 'NO_TRADE' = 'NO_TRADE';
  let consensusPercentage = 0;

  if (tradingResults.length > 0) {
    const yesCount = tradingResults.filter((r) => r.decision === 'YES').length;
    const noCount = tradingResults.filter((r) => r.decision === 'NO').length;

    if (yesCount > noCount) {
      consensusDecision = 'YES';
      consensusPercentage = (yesCount / tradingResults.length) * 100;
    } else if (noCount > yesCount) {
      consensusDecision = 'NO';
      consensusPercentage = (noCount / tradingResults.length) * 100;
    } else {
      consensusDecision = 'NO_TRADE';
      consensusPercentage = 50;
    }
  }

  return {
    results,
    consensusDecision,
    consensusPercentage,
    totalModels: results.length,
    successfulModels: successfulResults.length,
  };
};

// Query a single model and return result
const queryWithLayer = (
  name: string,
  layer: Layer.Layer<LanguageModel.LanguageModel, unknown, never>,
  userPrompt: string,
): Effect.Effect<SwarmResult, never> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    const result = yield* Effect.gen(function* () {
      const model = yield* LanguageModel.LanguageModel;
      const response = yield* model.generateText({
        prompt: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });
      return response;
    }).pipe(
      Effect.provide(layer),
      Effect.timeout(Duration.seconds(120)),
      Effect.catchAll((error) =>
        Effect.succeed({
          text: '',
          error: String(error),
        }),
      ),
    );

    const responseTimeMs = Date.now() - startTime;
    const text = result.text;
    const error = (result as { error?: string }).error;

    return {
      modelName: name,
      decision: error ? 'NO_TRADE' : parseDecision(text),
      reasoning: text.slice(0, 500),
      responseTimeMs,
      error,
    };
  });

// Run swarm analysis with all available models
export const runSwarmAnalysis = (market: {
  title: string;
  currentYesPrice: number;
  eventSlug: string;
}): Effect.Effect<SwarmResponse, never> =>
  Effect.gen(function* () {
    // Build list of available models based on API keys
    const models: Array<{
      name: string;
      layer: Layer.Layer<LanguageModel.LanguageModel, unknown, never>;
    }> = [];

    if (process.env.ANTHROPIC_API_KEY) {
      models.push({ name: 'claude-sonnet-4', layer: AnthropicLayer });
    }

    if (process.env.OPENAI_API_KEY) {
      models.push({ name: 'gpt-4o', layer: OpenAiLayer });
    }

    if (process.env.GOOGLE_API_KEY) {
      models.push({ name: 'gemini-1.5-pro', layer: GoogleLayer });
    }

    if (models.length === 0) {
      console.warn('No AI models configured - check API keys in Convex dashboard');
      return {
        results: [],
        consensusDecision: 'NO_TRADE' as const,
        consensusPercentage: 0,
        totalModels: 0,
        successfulModels: 0,
      };
    }

    console.log(`Querying ${models.length} models...`);
    const startTime = Date.now();
    const userPrompt = buildPrompt(market);

    // Retry schedule: exponential backoff starting at 1s, max 3 retries
    const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
      Schedule.intersect(Schedule.recurs(3)),
    );

    // Query all models with limited concurrency and retry on transient failures
    const results = yield* Effect.all(
      models.map(({ name, layer }) =>
        queryWithLayer(name, layer, userPrompt).pipe(
          Effect.retry(retrySchedule),
        ),
      ),
      { concurrency: 3 },
    );

    const totalTime = Date.now() - startTime;
    console.log(`All models responded in ${totalTime}ms`);

    // Log individual results
    for (const result of results) {
      const status = result.error
        ? `ERROR: ${result.error.slice(0, 50)}`
        : result.decision;
      console.log(`  ${result.modelName}: ${status} (${result.responseTimeMs}ms)`);
    }

    return calculateConsensus(results);
  });
```

### 1.3 Create the Analysis Action

**File:** `packages/backend/convex/analysis.ts` (add new action)

Add this alongside existing code:

```typescript
import { internalAction, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { Effect } from 'effect';
import { runSwarmAnalysis } from './ai/swarm';

// New simplified analysis action using @effect/ai
export const analyzeMarketWithSwarm = internalAction({
  args: { marketId: v.id('markets') },
  returns: v.object({
    success: v.boolean(),
    insightId: v.optional(v.id('insights')),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    insightId?: Id<'insights'>;
    error?: string;
  }> => {
    // Get market data
    const market = await ctx.runQuery(internal.markets.getMarketById, {
      marketId: args.marketId,
    });

    if (!market) {
      console.log(`Market not found: ${args.marketId}`);
      return { success: false, error: 'Market not found' };
    }

    console.log(`Analyzing market: ${market.title}`);

    try {
      // Run Effect.ts swarm with @effect/ai
      const swarmResponse = await Effect.runPromise(
        runSwarmAnalysis({
          title: market.title,
          currentYesPrice: market.currentYesPrice,
          eventSlug: market.eventSlug,
        })
      );

      console.log(`Swarm response: ${swarmResponse.consensusDecision} (${swarmResponse.consensusPercentage.toFixed(0)}%)`);

      // Need at least 2 successful models for a valid consensus
      if (swarmResponse.successfulModels < 2) {
        console.log('Not enough successful models for consensus');
        return { success: false, error: 'insufficient_models' };
      }

      // Don't save NO_TRADE insights (no clear edge)
      if (swarmResponse.consensusDecision === 'NO_TRADE') {
        console.log('No trading consensus - skipping insight save');
        return { success: true }; // Success but no insight
      }

      // Save insight directly
      const insightId: Id<'insights'> = await ctx.runMutation(
        internal.analysis.saveInsightSimple,
        {
          marketId: args.marketId,
          consensusDecision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
          totalModels: swarmResponse.totalModels,
          agreeingModels: swarmResponse.successfulModels,
          aggregatedReasoning: swarmResponse.results
            .filter(r => r.decision === swarmResponse.consensusDecision)
            .map(r => `${r.modelName}: ${r.reasoning.slice(0, 200)}`)
            .join(' | '),
          priceAtAnalysis: market.currentYesPrice,
        }
      );

      console.log(`Saved insight: ${insightId}`);
      return { success: true, insightId };
    } catch (error) {
      console.error(`Analysis failed for ${market.title}:`, error);
      return { success: false, error: String(error) };
    }
  },
});

// Simplified insight save (no analysisRunId required)
export const saveInsightSimple = internalMutation({
  args: {
    marketId: v.id('markets'),
    consensusDecision: v.union(v.literal('YES'), v.literal('NO'), v.literal('NO_TRADE')),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(),
    aggregatedReasoning: v.string(),
    priceAtAnalysis: v.number(),
  },
  returns: v.id('insights'),
  handler: async (ctx, args): Promise<Id<'insights'>> => {
    const confidenceLevel =
      args.consensusPercentage >= 80 ? 'high' as const :
      args.consensusPercentage >= 60 ? 'medium' as const : 'low' as const;

    const insightId = await ctx.db.insert('insights', {
      marketId: args.marketId,
      consensusDecision: args.consensusDecision,
      consensusPercentage: args.consensusPercentage,
      totalModels: args.totalModels,
      agreeingModels: args.agreeingModels,
      aggregatedReasoning: args.aggregatedReasoning,
      confidenceLevel,
      isHighConfidence: args.consensusPercentage >= 66,
      priceAtAnalysis: args.priceAtAnalysis,
      timestamp: Date.now(),
    });

    // Mark market as analyzed
    await ctx.db.patch(args.marketId, {
      lastAnalyzedAt: Date.now(),
    });

    return insightId;
  },
});
```

### 1.4 Update upsertMarket to Trigger Analysis

**File:** `packages/backend/convex/markets.ts` (update)

Add trigger at end of `upsertMarket`:

```typescript
// At the end of upsertMarket handler, add:

// Schedule analysis for new markets or markets not analyzed in the last hour
const shouldAnalyze = !existing ||
  !existing.lastAnalyzedAt ||
  (now - existing.lastAnalyzedAt) > 60 * 60 * 1000;

if (shouldAnalyze) {
  await ctx.scheduler.runAfter(0, internal.analysis.analyzeMarketWithSwarm, {
    marketId,
  });
}

return marketId;
```

### 1.5 Update Schema

**File:** `packages/backend/convex/schema.ts`

Make `analysisRunId` optional in insights table:

```typescript
insights: defineTable({
  analysisRunId: v.optional(v.id('analysisRuns')), // Made optional
  // ... rest stays the same
})
```

---

## Phase 2: Remove Analysis from Lofn

### 2.1 Simplify Lofn

Keep only:

- WebSocket connection to Polymarket
- Market filtering
- Convex upserts via `ConvexDataService`

### 2.2 Remove Unused Files

Delete from `apps/lofn/src/`:

- `services/ai/swarm.ts` → moved to Convex
- `services/ai/models.ts` → moved to Convex
- `services/analysis/AnalysisService.ts` → not needed

Keep:

- `services/ai/prompts.ts` → may still be useful
- `services/data/ConvexDataService.ts` → still needed for upserts

---

## Environment Variables (Convex Dashboard)

Add these in Convex Dashboard → Settings → Environment Variables:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

---

## Acceptance Criteria

- [ ] `@effect/ai` swarm runs in Convex action
- [ ] All 3 AI models called in parallel via Layers
- [ ] Insights saved directly (no analysisRun overhead)
- [ ] New/updated markets trigger analysis
- [ ] lofn only does collection (no AI code)
- [ ] `bun run typecheck` passes in both packages

---

## Files Changed

**Phase 1 (Convex):**

- `packages/backend/convex/ai/models.ts` - NEW (port from lofn)
- `packages/backend/convex/ai/swarm.ts` - NEW (port from lofn)
- `packages/backend/convex/analysis.ts` - UPDATE (add analyzeMarketWithSwarm)
- `packages/backend/convex/markets.ts` - UPDATE (add trigger)
- `packages/backend/convex/schema.ts` - UPDATE (optional analysisRunId)

**Phase 2 (Lofn):**

- `apps/lofn/src/services/ai/swarm.ts` - DELETE
- `apps/lofn/src/services/ai/models.ts` - DELETE
- `apps/lofn/src/services/analysis/` - DELETE

---

## Key Differences from Lofn Implementation

| Aspect          | Lofn (current)        | Convex (new)     |
| --------------- | --------------------- | ---------------- |
| API key access  | `bun.env`             | `process.env`    |
| Service pattern | `Context.Tag` + Layer | Plain functions  |
| Trigger         | Manual/scheduled      | On market upsert |
| Output          | CSV + Convex          | Convex only      |

---

**Generated:** 2025-12-19 (revised to use @effect/ai)
