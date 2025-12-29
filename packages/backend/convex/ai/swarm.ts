import { LanguageModel } from "@effect/ai";
import { Duration, Effect, Schedule } from "effect";
import {
  getConfiguredModels,
  getAggregationModel,
  type ModelEntry,
} from "./models";
import {
  PredictionOutputSchema,
  AggregationOutputSchema,
  type PredictionOutput,
  type Decision,
  type SwarmResult,
  type SwarmResponse,
  type AggregationOutput,
} from "./schema";

// Re-export types for external use
export type { SwarmResult, SwarmResponse, PredictionOutput, Decision };

/**
 * Calculate confidence-weighted consensus from model results.
 *
 * Instead of simple majority voting, this weighs each vote by its confidence score.
 * A high-confidence YES (90%) counts more than a low-confidence NO (40%).
 *
 * Uses AI-powered aggregation for synthesizing key factors, risks, and reasoning.
 */
const calculateConsensus = (results: SwarmResult[]) =>
  Effect.gen(function* () {
    const successfulResults = results.filter(
      (r): r is SwarmResult & { prediction: PredictionOutput } =>
        r.prediction !== null,
    );

    // Initialize vote distribution
    const voteDistribution = { YES: 0, NO: 0, NO_TRADE: 0 };

    if (successfulResults.length === 0) {
      return {
        results,
        consensusDecision: "NO_TRADE" as const,
        consensusPercentage: 0,
        totalModels: results.length,
        successfulModels: 0,
        voteDistribution,
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        aggregatedKeyFactors: [],
        aggregatedRisks: [],
        aggregatedReasoning: "",
      } satisfies SwarmResponse;
    }

    // Count votes by decision
    for (const result of successfulResults) {
      voteDistribution[result.prediction.decision]++;
    }

    // Filter to only trading decisions (YES or NO) for consensus
    const tradingResults = successfulResults.filter(
      (r) => r.prediction.decision !== "NO_TRADE",
    );

    // Default to NO_TRADE if no trading votes
    if (tradingResults.length === 0) {
      const allConfidences = successfulResults.map(
        (r) => r.prediction.confidence,
      );

      // Use AI aggregation for NO_TRADE consensus
      const aggregation = yield* aggregateWithAI(successfulResults, "NO_TRADE");

      return {
        results,
        consensusDecision: "NO_TRADE" as const,
        consensusPercentage: 100,
        totalModels: results.length,
        successfulModels: successfulResults.length,
        voteDistribution,
        averageConfidence:
          allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length,
        confidenceRange: {
          min: Math.min(...allConfidences),
          max: Math.max(...allConfidences),
        },
        aggregatedKeyFactors: [...aggregation.keyFactors],
        aggregatedRisks: [...aggregation.risks],
        aggregatedReasoning: aggregation.reasoning,
      } satisfies SwarmResponse;
    }

    // Calculate confidence-weighted scores for YES and NO
    let yesWeightedScore = 0;
    let noWeightedScore = 0;

    for (const result of tradingResults) {
      const confidence = result.prediction.confidence;
      if (result.prediction.decision === "YES") {
        yesWeightedScore += confidence;
      } else if (result.prediction.decision === "NO") {
        noWeightedScore += confidence;
      }
    }

    // Determine winner based on weighted scores
    let consensusDecision: Decision;
    let agreeingResults: typeof successfulResults;

    if (yesWeightedScore > noWeightedScore) {
      consensusDecision = "YES";
      agreeingResults = successfulResults.filter(
        (r) => r.prediction.decision === "YES",
      );
    } else if (noWeightedScore > yesWeightedScore) {
      consensusDecision = "NO";
      agreeingResults = successfulResults.filter(
        (r) => r.prediction.decision === "NO",
      );
    } else {
      // Tie - default to NO_TRADE
      consensusDecision = "NO_TRADE";
      agreeingResults = successfulResults;
    }

    // Calculate consensus percentage based on agreeing models
    const consensusPercentage =
      (agreeingResults.length / successfulResults.length) * 100;

    // Calculate confidence stats from agreeing models
    const confidences = agreeingResults.map((r) => r.prediction.confidence);
    const averageConfidence =
      confidences.reduce((a, b) => a + b, 0) / confidences.length;

    // Use AI aggregation for synthesized insights
    const aggregation = yield* aggregateWithAI(
      agreeingResults,
      consensusDecision,
    );

    return {
      results,
      consensusDecision,
      consensusPercentage,
      totalModels: results.length,
      successfulModels: successfulResults.length,
      voteDistribution,
      averageConfidence,
      confidenceRange: {
        min: Math.min(...confidences),
        max: Math.max(...confidences),
      },
      aggregatedKeyFactors: [...aggregation.keyFactors],
      aggregatedRisks: [...aggregation.risks],
      aggregatedReasoning: aggregation.reasoning,
    } satisfies SwarmResponse;
  });

/**
 * Simple fallback aggregation (used when AI aggregation fails).
 */
const simpleFallbackAggregation = (
  results: Array<{ prediction: PredictionOutput }>,
): AggregationOutput => {
  // Deduplicate key factors
  const allFactors = results.flatMap((r) => r.prediction.reasoning.keyFactors);
  const seenFactors = new Set<string>();
  const uniqueFactors: string[] = [];
  for (const factor of allFactors) {
    const key = factor.toLowerCase().trim();
    if (!seenFactors.has(key)) {
      seenFactors.add(key);
      uniqueFactors.push(factor);
    }
  }

  // Deduplicate risks
  const allRisks = results.flatMap((r) => r.prediction.reasoning.risks);
  const seenRisks = new Set<string>();
  const uniqueRisks: string[] = [];
  for (const risk of allRisks) {
    const key = risk.toLowerCase().trim();
    if (!seenRisks.has(key)) {
      seenRisks.add(key);
      uniqueRisks.push(risk);
    }
  }

  return {
    keyFactors: uniqueFactors.slice(0, 5),
    risks: uniqueRisks.slice(0, 3),
    reasoning: results
      .map((r) => r.prediction.reasoning.summary)
      .join(" | ")
      .slice(0, 500),
  };
};

/**
 * AI-powered aggregation using xiaomi/mimo-vl-flash.
 * Synthesizes key factors, risks, and reasoning from multiple model predictions.
 */
const aggregateWithAI = (
  results: Array<{ prediction: PredictionOutput }>,
  consensusDecision: Decision,
) =>
  Effect.gen(function* () {
    const aggregationLayer = getAggregationModel();

    // Fallback to simple aggregation if no model configured
    if (!aggregationLayer) {
      console.log("Aggregation model not configured, using simple fallback");
      return simpleFallbackAggregation(results);
    }

    // Build the aggregation prompt
    const modelOutputs = results
      .map(
        (r, i) => `Model ${i + 1}:
  Decision: ${r.prediction.decision}
  Confidence: ${r.prediction.confidence}%
  Key Factors: ${r.prediction.reasoning.keyFactors.join("; ")}
  Risks: ${r.prediction.reasoning.risks.join("; ")}
  Summary: ${r.prediction.reasoning.summary}`,
      )
      .join("\n\n");

    const systemPrompt = `You are an expert at synthesizing insights from multiple AI model predictions.
Your task is to aggregate and deduplicate the key factors, risks, and reasoning from multiple models into a concise summary.

Guidelines:
- Combine similar factors and risks, removing redundancy
- Prioritize factors mentioned by multiple models
- Create a unified reasoning summary that captures the essence of all models
- Keep the output concise and actionable
- Focus on factors supporting the consensus decision: ${consensusDecision}`;

    const userPrompt = `Synthesize the following ${results.length} model predictions into a unified analysis:

${modelOutputs}

Provide:
1. Top 3-5 most important key factors (deduplicated and synthesized)
2. Top 3 critical risks (deduplicated and synthesized)
3. A unified reasoning summary (max 500 chars)`;

    const aggregationResult = yield* Effect.gen(function* () {
      const lm = yield* LanguageModel.LanguageModel;
      const response = yield* lm.generateObject({
        prompt: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ],
        schema: AggregationOutputSchema,
        objectName: "aggregation",
      });
      return response;
    }).pipe(
      Effect.provide(aggregationLayer),
      // Effect.timeout(Duration.seconds(30)),
      Effect.catchAll((error) => {
        console.warn("AI aggregation failed, using fallback:", String(error));
        return Effect.succeed({ value: null as AggregationOutput | null });
      }),
    );

    // Use AI result or fallback
    if (aggregationResult.value) {
      console.log("AI aggregation completed successfully");
      return aggregationResult.value;
    }

    return simpleFallbackAggregation(results);
  });

/**
 * Query a single model using structured output (generateObject).
 */
const queryWithModel = (
  model: ModelEntry,
  systemPrompt: string,
  userPrompt: string,
) =>
  Effect.gen(function* () {
    const startTime = Date.now();

    const result = yield* Effect.gen(function* () {
      const lm = yield* LanguageModel.LanguageModel;
      // Use message array format to include system prompt
      const response = yield* lm.generateObject({
        prompt: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ],
        schema: PredictionOutputSchema,
        objectName: "prediction",
      });
      return response;
    }).pipe(
      Effect.provide(model.layer),
      // Effect.timeout(Duration.seconds(120)),
      Effect.catchAll((error) =>
        Effect.succeed({
          value: null as PredictionOutput | null,
          error: String(error),
        }),
      ),
    );

    const responseTimeMs = Date.now() - startTime;
    const error = (result as { error?: string }).error;

    return {
      modelName: model.id,
      prediction: result.value,
      responseTimeMs,
      error,
    } satisfies SwarmResult;
  });

/**
 * Build prompts for market analysis with structured output.
 * Prices are passed separately since markets table no longer stores volatile price data.
 */
export const buildPrompt = (
  market: {
    title: string;
    eventSlug: string;
  },
  prices: {
    yesPrice: number;
    noPrice: number;
  },
): { systemPrompt: string; userPrompt: string } => {
  const systemPrompt = `You are an expert prediction market analyst. Analyze the given market and provide a structured trading recommendation.

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
- 0-39: Very low confidence, recommend NO_TRADE unless strong contrarian signal

Provide 1-5 key factors supporting your decision and up to 3 risk factors.`;

  const userPrompt = `Analyze this prediction market:

**Market Question**: ${market.title}
**Current YES Price**: ${(prices.yesPrice * 100).toFixed(1)}%
**Current NO Price**: ${(prices.noPrice * 100).toFixed(1)}%
**Event Slug**: ${market.eventSlug}

Provide your trading decision with structured reasoning.`;

  return { systemPrompt, userPrompt };
};

/**
 * Query all configured AI models and return consensus decision.
 * Uses structured outputs for type-safe responses.
 */
export const querySwarm = (systemPrompt: string, userPrompt: string) =>
  Effect.gen(function* () {
    // Get all configured models from the factory
    const models = getConfiguredModels();

    if (models.length === 0) {
      console.warn("No AI models configured - check OPENROUTER_API_KEY");
      return {
        results: [],
        consensusDecision: "NO_TRADE" as const,
        consensusPercentage: 0,
        totalModels: 0,
        successfulModels: 0,
        voteDistribution: { YES: 0, NO: 0, NO_TRADE: 0 },
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        aggregatedKeyFactors: [],
        aggregatedRisks: [],
        aggregatedReasoning: "",
      };
    }

    console.log(
      `Querying ${models.length} models via OpenRouter: ${models.map((m) => m.displayName).join(", ")}`,
    );
    const startTime = Date.now();

    // Retry schedule: exponential backoff starting at 1s, max 3 retries
    const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
      Schedule.intersect(Schedule.recurs(3)),
    );

    // Query all models with limited concurrency and retry on transient failures
    const results = yield* Effect.all(
      models.map((model) =>
        queryWithModel(model, systemPrompt, userPrompt).pipe(
          Effect.retry(retrySchedule),
        ),
      ),
      { concurrency: 4 },
    );

    const totalTime = Date.now() - startTime;
    console.log(`All models responded in ${totalTime}ms`);

    // Log individual results
    for (const result of results) {
      if (result.error) {
        console.log(
          `  ${result.modelName}: ERROR: ${result.error.slice(0, 50)} (${result.responseTimeMs}ms)`,
        );
      } else if (result.prediction) {
        console.log(
          `  ${result.modelName}: ${result.prediction.decision} (${result.prediction.confidence}% confidence, ${result.responseTimeMs}ms)`,
        );
      }
    }

    // Calculate consensus with AI-powered aggregation
    const consensus = yield* calculateConsensus(results);
    return consensus;
  });
