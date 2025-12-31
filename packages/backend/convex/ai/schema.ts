import { Schema } from "effect";

/**
 * Structured output schema for AI prediction responses.
 * This schema defines the exact structure that AI models must return
 * when analyzing prediction markets.
 */

// Decision enum for trading recommendations
export const DecisionSchema = Schema.Literal(
  "YES",
  "NO",
  "NO_TRADE",
).annotations({
  identifier: "Decision",
  description:
    "Trading decision: YES to buy YES shares, NO to buy NO shares, NO_TRADE to abstain",
});

export type Decision = typeof DecisionSchema.Type;

// Structured reasoning with key factors and risks
export const ReasoningSchema = Schema.Struct({
  summary: Schema.String.annotations({
    description: "Brief summary of the reasoning (max 500 chars)",
  }),

  keyFactors: Schema.Array(Schema.String).annotations({
    description: "1-5 key factors influencing the decision",
  }),

  risks: Schema.Array(Schema.String).annotations({
    description: "Up to 3 risk factors to consider",
  }),
}).annotations({
  identifier: "Reasoning",
});

export type Reasoning = typeof ReasoningSchema.Type;

// Edge assessment comparing model estimate to market price
export const EdgeAssessmentSchema = Schema.Struct({
  hasEdge: Schema.Boolean.annotations({
    description: "Whether there is a significant edge to exploit",
  }),

  edgeSize: Schema.Number.annotations({
    description: "Size of edge in percentage points (-100 to 100)",
  }),

  direction: Schema.Literal("underpriced", "overpriced", "fair").annotations({
    description:
      "Whether the market is underpriced, overpriced, or fairly priced",
  }),
}).annotations({
  identifier: "EdgeAssessment",
});

export type EdgeAssessment = typeof EdgeAssessmentSchema.Type;

/**
 * Main schema for AI prediction outputs.
 * All AI models must return responses conforming to this structure.
 */
export const PredictionOutputSchema = Schema.Struct({
  decision: DecisionSchema,

  confidence: Schema.Number.annotations({
    description: "Confidence level 0-100 in the decision",
  }),

  reasoning: ReasoningSchema,

  estimatedProbability: Schema.optional(Schema.Number).annotations({
    description: "Estimated true probability of YES outcome (0-100)",
  }),

  edgeAssessment: Schema.optional(EdgeAssessmentSchema).annotations({
    description: "Assessment of pricing edge vs market",
  }),
}).annotations({
  identifier: "PredictionOutput",
  title: "AI Prediction Output",
  description:
    "Structured output from an AI model analyzing a prediction market",
});

export type PredictionOutput = typeof PredictionOutputSchema.Type;

/**
 * Result from a single model query in the swarm
 */
export interface SwarmResult {
  modelName: string;
  prediction: PredictionOutput | null; // null if model failed
  responseTimeMs: number;
  error?: string;
}

/**
 * Schema for AI-powered aggregation of model outputs.
 * Used by the aggregation model to synthesize insights from multiple predictions.
 */
export const AggregationOutputSchema = Schema.Struct({
  keyFactors: Schema.Array(Schema.String).annotations({
    description:
      "Top 3-5 most important factors across all models, deduplicated and synthesized",
  }),

  risks: Schema.Array(Schema.String).annotations({
    description:
      "Top 3 most critical risks across all models, deduplicated and synthesized",
  }),

  reasoning: Schema.String.annotations({
    description:
      "Synthesized reasoning summary (max 500 chars) combining insights from all models",
  }),
}).annotations({
  identifier: "AggregationOutput",
  title: "AI Aggregation Output",
  description:
    "Synthesized output from aggregating multiple AI model predictions",
});

export type AggregationOutput = typeof AggregationOutputSchema.Type;

/**
 * Aggregated response from the AI swarm with consensus calculation
 */
export interface SwarmResponse {
  results: SwarmResult[];
  consensusDecision: Decision;
  consensusPercentage: number;
  totalModels: number;
  successfulModels: number;

  // New structured fields
  voteDistribution: {
    YES: number;
    NO: number;
    NO_TRADE: number;
  };
  averageConfidence: number;
  confidenceRange: {
    min: number;
    max: number;
  };
  aggregatedKeyFactors: string[];
  aggregatedRisks: string[];
  aggregatedReasoning: string;
}
