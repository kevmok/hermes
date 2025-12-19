# Plan: CSV Files Alignment & True Swarm Mode Implementation

## Overview

The current implementation has two gaps compared to the original Python agent:

1. **CSV Schema Mismatch**: Missing columns from original `markets.csv` and `predictions.csv`
2. **Fake Swarm Mode**: `USE_SWARM_MODE` only uses a single model, not multiple AIs in parallel

## Problem Statement

### CSV Files

The original Python agent uses these CSV schemas:

**markets.csv** (original has 10 columns):

- `timestamp`, `market_id`, `event_slug`, `title`, `outcome`, `price`, `size_usd`, `first_seen`, `last_analyzed`, `last_trade_timestamp`

Current implementation is missing: `last_analyzed`

**predictions.csv** (original has 15 columns):

- `run_id`, `timestamp`, `market_id`, `event_slug`, `title`, `outcome`, `price`, `model_name`, `decision`, `reasoning`, `consensus_decision`, `consensus_percentage`, `claude_decision`, `opus_decision`, `openai_decision`, etc.

Current implementation only has 6 columns and doesn't track per-model decisions or consensus.

### Swarm Mode

The original `swarm_agent.py`:

- Queries 6 models **in parallel** using ThreadPoolExecutor
- Collects YES/NO/NO_TRADE from each model
- Calculates majority consensus
- Uses a separate AI to summarize findings

Current `analysis.ts`:

- Uses only ONE model (Claude)
- Calls it "swarm mode" but doesn't query multiple models
- No actual consensus calculation

## Implementation Plan

### Phase 1: Fix CSV Schema

#### 1.1 Update src/data.ts - markets DataFrame

Add `last_analyzed` column:

```typescript
const createEmptyMarketsDF = () =>
  pl.DataFrame({
    market_id: [] as string[],
    event_slug: [] as string[],
    title: [] as string[],
    outcome: [] as string[],
    price: [] as number[],
    size_usd: [] as number[],
    timestamp: [] as string[],
    first_seen: [] as string[],
    last_trade_timestamp: [] as string[],
    last_analyzed: [] as string[],  // NEW
    analyzed: [] as boolean[],
  });
```

#### 1.2 Update src/filters.ts - MarketRow interface

```typescript
export interface MarketRow {
  // ... existing fields ...
  last_analyzed: string;  // NEW - ISO timestamp of last analysis
}
```

#### 1.3 Update src/analysis.ts - Set last_analyzed

When marking markets as analyzed, also set `last_analyzed` timestamp.

### Phase 2: Implement True Swarm Mode

#### 2.1 Create src/swarm.ts - Multi-model query service

```typescript
import { Effect, Layer, Context } from "effect";
import { LanguageModel } from "@effect/ai";

export interface SwarmResult {
  modelName: string;
  decision: "YES" | "NO" | "NO_TRADE";
  reasoning: string;
  responseTimeMs: number;
}

export interface SwarmResponse {
  results: SwarmResult[];
  consensusDecision: string;
  consensusPercentage: number;
  totalModels: number;
}

export class SwarmService extends Context.Tag("SwarmService")<
  SwarmService,
  {
    readonly query: (prompt: string) => Effect.Effect<SwarmResponse, Error>;
  }
>() {}
```

#### 2.2 Update src/models.ts - Export all model layers

```typescript
// Tag for multi-model access
export class ModelRegistry extends Context.Tag("ModelRegistry")<
  ModelRegistry,
  {
    readonly anthropic: LanguageModel.LanguageModel;
    readonly openai: LanguageModel.LanguageModel;
    readonly google: LanguageModel.LanguageModel;
  }
>() {}
```

#### 2.3 Implement parallel queries

Use `Effect.all` with `{ concurrency: "unbounded" }` to query all models in parallel:

```typescript
const queryAllModels = (prompt: string) =>
  Effect.all(
    [
      queryModel(anthropicModel, "claude-sonnet-4", prompt),
      queryModel(openaiModel, "gpt-4o", prompt),
      queryModel(googleModel, "gemini-1.5-pro", prompt),
    ],
    { concurrency: "unbounded" }
  );
```

#### 2.4 Implement consensus calculation

```typescript
const calculateConsensus = (results: SwarmResult[]): SwarmResponse => {
  const validResults = results.filter(r => r.decision !== "NO_TRADE");
  const yesCount = validResults.filter(r => r.decision === "YES").length;
  const noCount = validResults.filter(r => r.decision === "NO").length;

  const consensusDecision = yesCount > noCount ? "YES" : "NO";
  const consensusPercentage = Math.max(yesCount, noCount) / validResults.length * 100;

  return {
    results,
    consensusDecision,
    consensusPercentage,
    totalModels: results.length,
  };
};
```

#### 2.5 Update src/analysis.ts - Use SwarmService

```typescript
if (CONFIG.USE_SWARM_MODE) {
  const swarm = yield* SwarmService;
  const response = yield* swarm.query(userPrompt);

  // Save individual predictions
  for (const result of response.results) {
    yield* savePrediction(runId, marketId, result);
  }

  // Save consensus
  yield* saveConsensus(runId, marketId, response);
}
```

### Phase 3: Update predictions.csv Schema

Expand predictions DataFrame to match original:

```typescript
const createEmptyPredictionsDF = () =>
  pl.DataFrame({
    run_id: [] as string[],
    timestamp: [] as string[],
    market_id: [] as string[],
    event_slug: [] as string[],
    title: [] as string[],
    outcome: [] as string[],
    price: [] as number[],
    model_name: [] as string[],
    decision: [] as string[],
    reasoning: [] as string[],
    consensus_decision: [] as string[],
    consensus_percentage: [] as number[],
  });
```

## Files to Modify

1. `src/data.ts` - Add `last_analyzed` column to markets schema
2. `src/filters.ts` - Update MarketRow interface
3. `src/models.ts` - Export ModelRegistry with all models
4. `src/swarm.ts` - NEW: SwarmService for parallel AI queries
5. `src/analysis.ts` - Use SwarmService, save per-model predictions
6. `src/main.ts` - Provide SwarmService layer

## Success Criteria

- [ ] `markets.csv` includes `last_analyzed` column
- [ ] `predictions.csv` stores individual model decisions
- [ ] Swarm mode queries 3 models in parallel (Anthropic, OpenAI, Google)
- [ ] Consensus percentage calculated from model agreement
- [ ] Individual model response times logged
- [ ] Graceful fallback if a model fails (others continue)

## Alternative: Simple Multi-Model (No SwarmService)

If full SwarmService is overkill, a simpler approach:

```typescript
// In analysis.ts, query each model sequentially
const models = [
  { name: "claude", layer: PrimaryModelLayer },
  { name: "gpt-4o", layer: OpenAiLayer },
  { name: "gemini", layer: GoogleLayer },
];

const results = [];
for (const { name, layer } of models) {
  const result = yield* queryModel(prompt).pipe(Effect.provide(layer));
  results.push({ modelName: name, ...result });
}
```

This avoids the complexity of a service but still queries multiple models.
