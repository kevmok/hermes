# feat: Implement Structured AI Outputs with Effect Schema

## Overview

Convert the AI generation system from text-based responses to structured schema-based outputs using Effect.ts `LanguageModel.generateObject`. This provides type-safe, validated AI responses with proper confidence scores, structured reasoning, and better downstream data handling.

**Current State**: AI models return free-text responses that are parsed with regex to extract decisions (`"YES"`, `"NO"`, or defaults to `"NO_TRADE"`). Confidence scores are optional and never populated. Reasoning is unstructured text.

**Target State**: AI models return validated structured objects conforming to Effect Schema, with required confidence scores, structured reasoning fields, and proper type safety throughout the pipeline.

## Problem Statement

1. **Unreliable Parsing**: Text-based parsing is fragile - depends on AI following prompt format exactly
2. **Missing Data**: `confidence` field exists in schema but is never populated (always undefined)
3. **Unstructured Reasoning**: Free-text reasoning is hard to display, aggregate, or analyze
4. **No Validation**: Invalid AI responses silently default to `NO_TRADE` instead of proper error handling
5. **Lost Information**: Rich model outputs are reduced to simple strings

## Proposed Solution

Use Effect.ts `LanguageModel.generateObject` with Effect Schema to:
1. Define strict schema for AI prediction outputs
2. Get validated, type-safe responses from all AI providers
3. Store structured data in database with proper fields
4. Display rich information in frontend

## Technical Approach

### Architecture Changes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BEFORE (Text Parsing)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  AI Model → Free Text → Regex Parse → Extract Decision → Database      │
│                         ↓                                               │
│              "Looking at market... I recommend YES..."                  │
│                         ↓                                               │
│              parseDecision() → "YES" (confidence: undefined)            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         AFTER (Structured Output)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  AI Model → LanguageModel.generateObject → Validated Schema → Database │
│                         ↓                                               │
│              { decision: "YES", confidence: 85, reasoning: {...} }     │
│                         ↓                                               │
│              Type-safe object with all required fields                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Effect Schema Definition

```typescript
// packages/backend/convex/ai/schema.ts (NEW FILE)
import { Schema } from "effect"

// Individual prediction from a single AI model
export const PredictionOutputSchema = Schema.Struct({
  decision: Schema.Literal("YES", "NO", "NO_TRADE").annotations({
    description: "Trading decision: YES to buy YES shares, NO to buy NO shares, NO_TRADE to abstain"
  }),

  confidence: Schema.Number.pipe(
    Schema.between(0, 100)
  ).annotations({
    description: "Confidence level 0-100 in the decision"
  }),

  reasoning: Schema.Struct({
    summary: Schema.String.pipe(Schema.maxLength(500)).annotations({
      description: "Brief summary of the reasoning (max 500 chars)"
    }),

    keyFactors: Schema.Array(Schema.String).pipe(
      Schema.minItems(1),
      Schema.maxItems(5)
    ).annotations({
      description: "1-5 key factors influencing the decision"
    }),

    risks: Schema.Array(Schema.String).pipe(
      Schema.maxItems(3)
    ).annotations({
      description: "Up to 3 risk factors to consider"
    })
  }),

  estimatedProbability: Schema.optional(
    Schema.Number.pipe(Schema.between(0, 100))
  ).annotations({
    description: "Estimated true probability of YES outcome (0-100)"
  }),

  edgeAssessment: Schema.optional(Schema.Struct({
    hasEdge: Schema.Boolean,
    edgeSize: Schema.Number.pipe(Schema.between(-100, 100)),
    direction: Schema.Literal("underpriced", "overpriced", "fair")
  })).annotations({
    description: "Assessment of pricing edge vs market"
  })
}).annotations({
  identifier: "PredictionOutput",
  title: "AI Prediction Output",
  description: "Structured output from an AI model analyzing a prediction market"
})

export type PredictionOutput = typeof PredictionOutputSchema.Type
```

### Implementation Phases

#### Phase 1: Schema & Core Changes

**Files to modify:**

1. **`packages/backend/convex/ai/schema.ts`** (NEW)
   - Define `PredictionOutputSchema` as above
   - Export types for use throughout codebase

2. **`packages/backend/convex/ai/swarm.ts`** (lines 155-228)
   - Replace `LanguageModel.generateText` with `LanguageModel.generateObject`
   - Update `queryWithLayer` function signature
   - Handle schema validation errors with retry logic

3. **`packages/backend/convex/ai/models.ts`** (lines 1-61)
   - Verify model configurations support structured outputs
   - Update model layer types if needed

**Code changes for `swarm.ts`:**

```typescript
// packages/backend/convex/ai/swarm.ts

import { PredictionOutputSchema, type PredictionOutput } from "./schema"

// Updated result type
export interface SwarmResult {
  modelName: string
  prediction: PredictionOutput | null  // null if failed
  responseTimeMs: number
  error?: string
}

// Updated query function
const queryWithLayer = (
  name: string,
  layer: Layer.Layer<LanguageModel.LanguageModel>,
  systemPrompt: string,
  userPrompt: string
) =>
  Effect.gen(function* () {
    const startTime = Date.now()

    const response = yield* LanguageModel.generateObject({
      prompt: userPrompt,
      system: systemPrompt,
      schema: PredictionOutputSchema,
      objectName: "prediction"
    })

    const endTime = Date.now()

    return {
      modelName: name,
      prediction: response.value,
      responseTimeMs: endTime - startTime
    } satisfies SwarmResult
  }).pipe(
    Effect.provide(layer),
    Effect.catchAll((error) =>
      Effect.succeed({
        modelName: name,
        prediction: null,
        responseTimeMs: 0,
        error: error instanceof Error ? error.message : String(error)
      } satisfies SwarmResult)
    )
  )
```

#### Phase 2: Database Schema Updates

**Files to modify:**

1. **`packages/backend/convex/schema.ts`** (lines 149-245)

```typescript
// Enhanced modelPredictions table
modelPredictions: defineTable({
  analysisRunId: v.optional(v.id("analysisRuns")), // Made optional for signal-based predictions
  signalId: v.optional(v.id("signals")), // NEW: Link to signal if from whale trade
  marketId: v.id("markets"),
  modelName: v.string(),

  // Core prediction (required)
  decision: v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
  confidence: v.number(), // NOW REQUIRED, 0-100

  // Structured reasoning (required)
  reasoning: v.object({
    summary: v.string(),
    keyFactors: v.array(v.string()),
    risks: v.array(v.string()),
  }),

  // Optional enhanced fields
  estimatedProbability: v.optional(v.number()),
  edgeAssessment: v.optional(v.object({
    hasEdge: v.boolean(),
    edgeSize: v.number(),
    direction: v.union(v.literal("underpriced"), v.literal("overpriced"), v.literal("fair")),
  })),

  // Metadata
  responseTimeMs: v.number(),
  timestamp: v.number(),
  schemaVersion: v.string(), // NEW: "2.0.0" for structured outputs
})
  .index("by_analysis_run", ["analysisRunId"])
  .index("by_signal", ["signalId"])
  .index("by_market", ["marketId"])
  .index("by_model", ["modelName"])
  .index("by_timestamp", ["timestamp"]),

// Enhanced signals table
signals: defineTable({
  marketId: v.id("markets"),
  triggerTrade: v.union(
    v.object({ size: v.number(), price: v.number(), side: v.union(v.literal("YES"), v.literal("NO")) }),
    v.array(v.object({ size: v.number(), price: v.number(), side: v.union(v.literal("YES"), v.literal("NO")) }))
  ),

  // Consensus results
  consensusDecision: v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
  consensusPercentage: v.number(),

  // NEW: Vote distribution
  voteDistribution: v.object({
    YES: v.number(),
    NO: v.number(),
    NO_TRADE: v.number(),
  }),

  // NEW: Aggregated confidence
  averageConfidence: v.number(), // Average confidence of agreeing models
  confidenceRange: v.object({
    min: v.number(),
    max: v.number(),
  }),

  totalModels: v.number(),
  agreeingModels: v.number(),

  // Structured aggregated reasoning
  aggregatedReasoning: v.string(), // Keep for backwards compatibility
  aggregatedKeyFactors: v.array(v.string()), // NEW: Merged key factors
  aggregatedRisks: v.array(v.string()), // NEW: Merged risks

  confidenceLevel: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  isHighConfidence: v.boolean(),
  priceAtTrigger: v.number(),
  signalTimestamp: v.number(),

  schemaVersion: v.string(), // NEW: "2.0.0"
})
  // ... existing indexes
```

#### Phase 3: Analysis Logic Updates

**Files to modify:**

1. **`packages/backend/convex/analysis.ts`** (lines 467-600)

Update `analyzeTradeForSignal` to:
- Use structured outputs from swarm
- Calculate weighted consensus with confidence
- Aggregate structured reasoning fields
- Store individual model predictions with full structure

```typescript
// Updated consensus calculation
function calculateStructuredConsensus(results: SwarmResult[]): ConsensusResult {
  const successful = results.filter(r => r.prediction !== null)

  if (successful.length === 0) {
    return {
      decision: "NO_TRADE",
      percentage: 0,
      totalModels: 0,
      voteDistribution: { YES: 0, NO: 0, NO_TRADE: 0 },
      averageConfidence: 0,
      confidenceRange: { min: 0, max: 0 },
      aggregatedKeyFactors: [],
      aggregatedRisks: []
    }
  }

  // Count votes
  const voteDistribution = {
    YES: successful.filter(r => r.prediction!.decision === "YES").length,
    NO: successful.filter(r => r.prediction!.decision === "NO").length,
    NO_TRADE: successful.filter(r => r.prediction!.decision === "NO_TRADE").length,
  }

  // Determine winner (excluding NO_TRADE from decision)
  const tradingVotes = successful.filter(r => r.prediction!.decision !== "NO_TRADE")
  let decision: "YES" | "NO" | "NO_TRADE"
  let agreeingModels: SwarmResult[]

  if (tradingVotes.length === 0) {
    decision = "NO_TRADE"
    agreeingModels = successful
  } else if (voteDistribution.YES > voteDistribution.NO) {
    decision = "YES"
    agreeingModels = successful.filter(r => r.prediction!.decision === "YES")
  } else if (voteDistribution.NO > voteDistribution.YES) {
    decision = "NO"
    agreeingModels = successful.filter(r => r.prediction!.decision === "NO")
  } else {
    decision = "NO_TRADE" // Tie
    agreeingModels = successful
  }

  // Calculate confidence stats from agreeing models
  const confidences = agreeingModels.map(r => r.prediction!.confidence)
  const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length

  // Aggregate reasoning from agreeing models
  const allKeyFactors = agreeingModels.flatMap(r => r.prediction!.reasoning.keyFactors)
  const allRisks = agreeingModels.flatMap(r => r.prediction!.reasoning.risks)

  // Deduplicate and take top factors
  const aggregatedKeyFactors = [...new Set(allKeyFactors)].slice(0, 5)
  const aggregatedRisks = [...new Set(allRisks)].slice(0, 3)

  return {
    decision,
    percentage: (agreeingModels.length / successful.length) * 100,
    totalModels: successful.length,
    agreeingModels: agreeingModels.length,
    voteDistribution,
    averageConfidence,
    confidenceRange: {
      min: Math.min(...confidences),
      max: Math.max(...confidences),
    },
    aggregatedKeyFactors,
    aggregatedRisks,
    aggregatedReasoning: agreeingModels
      .map(r => r.prediction!.reasoning.summary)
      .join(" | ")
      .slice(0, 1000)
  }
}
```

#### Phase 4: Prompt Updates

**Files to modify:**

1. **`packages/backend/convex/ai/swarm.ts`** (lines 126-152)

Update prompts for structured output mode:

```typescript
const buildSystemPrompt = () => `You are an expert prediction market analyst. Analyze the given market and provide a structured trading recommendation.

Your analysis should consider:
1. Current market price vs your estimated true probability
2. Edge assessment (is the market underpriced, overpriced, or fair?)
3. Key factors supporting your decision
4. Risk factors that could invalidate your analysis

Decision Guidelines:
- Recommend YES if you believe the market is underpriced (true probability > market price + 10%)
- Recommend NO if you believe the market is overpriced (true probability < market price - 10%)
- Recommend NO_TRADE if the edge is small (<10%) or uncertainty is high

Confidence Guidelines:
- 80-100: Very confident, strong edge with clear supporting evidence
- 60-79: Moderately confident, reasonable edge with some uncertainty
- 40-59: Low confidence, small edge or significant uncertainty
- 0-39: Very low confidence, recommend NO_TRADE unless strong contrarian signal`

const buildUserPrompt = (market: MarketData) => `Analyze this prediction market:

**Market Question**: ${market.title}
**Current YES Price**: ${(market.currentYesPrice * 100).toFixed(1)}%
**Current NO Price**: ${(market.currentNoPrice * 100).toFixed(1)}%
**24h Volume**: $${market.volume24h.toLocaleString()}
**Total Volume**: $${market.totalVolume.toLocaleString()}
${market.description ? `**Description**: ${market.description}` : ""}
${market.category ? `**Category**: ${market.category}` : ""}

Provide your trading decision with structured reasoning.`
```

#### Phase 5: Frontend Updates

**Files to modify:**

1. **`apps/web/src/routes/dashboard/signals/-components/signal-card.tsx`** (lines 1-324)

Add display for new structured fields:

```tsx
// Enhanced SignalCard with structured data display
export interface Signal {
  _id: string
  // ... existing fields

  // NEW structured fields
  voteDistribution?: {
    YES: number
    NO: number
    NO_TRADE: number
  }
  averageConfidence?: number
  confidenceRange?: {
    min: number
    max: number
  }
  aggregatedKeyFactors?: string[]
  aggregatedRisks?: string[]
  schemaVersion?: string
}

// In render:
{/* Key Factors (NEW) */}
{signal.aggregatedKeyFactors && signal.aggregatedKeyFactors.length > 0 && (
  <div className="mt-3 space-y-1">
    <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
      Key Factors
    </span>
    <div className="flex flex-wrap gap-1.5">
      {signal.aggregatedKeyFactors.map((factor, i) => (
        <Badge
          key={i}
          variant="outline"
          className="text-xs bg-white/[0.02]"
        >
          {factor}
        </Badge>
      ))}
    </div>
  </div>
)}

{/* Confidence Range (NEW) */}
{signal.averageConfidence !== undefined && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <span>Avg Confidence:</span>
    <span className="font-semibold text-white">
      {signal.averageConfidence.toFixed(0)}%
    </span>
    {signal.confidenceRange && (
      <span className="text-muted-foreground/60">
        ({signal.confidenceRange.min.toFixed(0)}-{signal.confidenceRange.max.toFixed(0)}%)
      </span>
    )}
  </div>
)}
```

2. **`apps/web/src/routes/dashboard/signals/-components/signal-detail-modal.tsx`**

Add detailed view of individual model predictions with structured data.

## Acceptance Criteria

### Functional Requirements

- [ ] AI models return structured objects matching `PredictionOutputSchema`
- [ ] All predictions have required `confidence` score (0-100)
- [ ] Reasoning includes `summary`, `keyFactors`, and `risks` arrays
- [ ] Consensus calculation uses structured data
- [ ] Vote distribution is tracked and stored
- [ ] Average confidence and confidence range are calculated
- [ ] Key factors and risks are aggregated across agreeing models
- [ ] Schema validation errors are caught and logged
- [ ] Failed validations retry once, then fall back to error state
- [ ] Individual model predictions are stored with full structure

### Non-Functional Requirements

- [ ] Latency increase <30% compared to text-based approach
- [ ] Schema validation adds <50ms per response
- [ ] Backwards compatible with existing signals (can display old format)
- [ ] Feature flag to toggle structured outputs on/off

### Quality Gates

- [ ] Unit tests for Effect Schema validation (valid/invalid cases)
- [ ] Integration tests with mocked AI responses
- [ ] Type safety throughout pipeline (no `any` types)
- [ ] Database migrations tested in dev environment

## Migration Strategy

### Phase 1: Parallel Systems
1. Add `schemaVersion` field to all tables
2. Implement structured outputs behind feature flag
3. Old signals continue to work (schemaVersion: "1.0.0")
4. New signals use structured format (schemaVersion: "2.0.0")

### Phase 2: Gradual Rollout
1. Enable for 10% of signals (canary)
2. Monitor for errors, latency, cost
3. Increase to 50%, then 100%

### Phase 3: Cleanup
1. Remove text-parsing code path
2. Migrate display logic to assume structured data
3. Optionally backfill old signals (re-analyze)

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Effect.ts API doesn't support structured outputs | High | Verify API exists before starting; fall back to provider-specific APIs |
| AI models don't comply with schema | Medium | Implement retry logic; log failures for prompt tuning |
| Increased latency | Medium | Set acceptable threshold; optimize prompts if needed |
| Breaking existing signals | High | Schema versioning; backwards-compatible display |
| Higher API costs | Low | Monitor token usage; structured may be similar or less |

## Files to Create/Modify

### New Files
- `packages/backend/convex/ai/schema.ts` - Effect Schema definitions

### Modified Files
- `packages/backend/convex/ai/swarm.ts` - Use generateObject instead of generateText
- `packages/backend/convex/ai/models.ts` - Verify structured output support
- `packages/backend/convex/schema.ts` - Add new fields to tables
- `packages/backend/convex/analysis.ts` - Update consensus calculation
- `packages/backend/convex/signals.ts` - Update signal creation
- `apps/web/src/routes/dashboard/signals/-components/signal-card.tsx` - Display new fields
- `apps/web/src/routes/dashboard/signals/-components/signal-detail-modal.tsx` - Detailed view

## References

### Internal References
- Current swarm implementation: `packages/backend/convex/ai/swarm.ts:155-228`
- Database schema: `packages/backend/convex/schema.ts:149-245`
- Signal card display: `apps/web/src/routes/dashboard/signals/-components/signal-card.tsx`

### External References
- Effect.ts LanguageModel API: https://effect-ts.github.io/effect/ai/ai/LanguageModel.ts.html
- Effect Schema docs: https://effect.website/docs/schema/introduction/
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs

### Related Work
- Dashboard consolidation: `plans/dashboard-consolidation-and-detail-views.md`
