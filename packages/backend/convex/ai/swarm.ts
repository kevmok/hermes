import { LanguageModel } from '@effect/ai';
import { Duration, Effect, Layer, Schedule } from 'effect';
import { PrimaryModelLayer, OpenAiLayer, GoogleLayer } from './models';
import {
  PredictionOutputSchema,
  type PredictionOutput,
  type Decision,
  type SwarmResult,
  type SwarmResponse,
} from './schema';

// Re-export types for external use
export type { SwarmResult, SwarmResponse, PredictionOutput, Decision };

/**
 * Calculate confidence-weighted consensus from model results.
 *
 * Instead of simple majority voting, this weighs each vote by its confidence score.
 * A high-confidence YES (90%) counts more than a low-confidence NO (40%).
 */
const calculateConsensus = (results: SwarmResult[]): SwarmResponse => {
  const successfulResults = results.filter(
    (r): r is SwarmResult & { prediction: PredictionOutput } =>
      r.prediction !== null,
  );

  // Initialize vote distribution
  const voteDistribution = { YES: 0, NO: 0, NO_TRADE: 0 };

  if (successfulResults.length === 0) {
    return {
      results,
      consensusDecision: 'NO_TRADE',
      consensusPercentage: 0,
      totalModels: results.length,
      successfulModels: 0,
      voteDistribution,
      averageConfidence: 0,
      confidenceRange: { min: 0, max: 0 },
      aggregatedKeyFactors: [],
      aggregatedRisks: [],
      aggregatedReasoning: '',
    };
  }

  // Count votes by decision
  for (const result of successfulResults) {
    voteDistribution[result.prediction.decision]++;
  }

  // Filter to only trading decisions (YES or NO) for consensus
  const tradingResults = successfulResults.filter(
    (r) => r.prediction.decision !== 'NO_TRADE',
  );

  // Default to NO_TRADE if no trading votes
  if (tradingResults.length === 0) {
    const allConfidences = successfulResults.map(
      (r) => r.prediction.confidence,
    );
    return {
      results,
      consensusDecision: 'NO_TRADE',
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
      aggregatedKeyFactors: aggregateKeyFactors(successfulResults),
      aggregatedRisks: aggregateRisks(successfulResults),
      aggregatedReasoning: aggregateReasoning(successfulResults),
    };
  }

  // Calculate confidence-weighted scores for YES and NO
  let yesWeightedScore = 0;
  let noWeightedScore = 0;

  for (const result of tradingResults) {
    const confidence = result.prediction.confidence;
    if (result.prediction.decision === 'YES') {
      yesWeightedScore += confidence;
    } else if (result.prediction.decision === 'NO') {
      noWeightedScore += confidence;
    }
  }

  // Determine winner based on weighted scores
  let consensusDecision: Decision;
  let agreeingResults: typeof successfulResults;

  if (yesWeightedScore > noWeightedScore) {
    consensusDecision = 'YES';
    agreeingResults = successfulResults.filter(
      (r) => r.prediction.decision === 'YES',
    );
  } else if (noWeightedScore > yesWeightedScore) {
    consensusDecision = 'NO';
    agreeingResults = successfulResults.filter(
      (r) => r.prediction.decision === 'NO',
    );
  } else {
    // Tie - default to NO_TRADE
    consensusDecision = 'NO_TRADE';
    agreeingResults = successfulResults;
  }

  // Calculate consensus percentage based on agreeing models
  const consensusPercentage =
    (agreeingResults.length / successfulResults.length) * 100;

  // Calculate confidence stats from agreeing models
  const confidences = agreeingResults.map((r) => r.prediction.confidence);
  const averageConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

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
    aggregatedKeyFactors: aggregateKeyFactors(agreeingResults),
    aggregatedRisks: aggregateRisks(agreeingResults),
    aggregatedReasoning: aggregateReasoning(agreeingResults),
  };
};

/**
 * Aggregate key factors from multiple model predictions.
 * Deduplicates and takes top 5.
 */
const aggregateKeyFactors = (
  results: Array<{ prediction: PredictionOutput }>,
): string[] => {
  const allFactors = results.flatMap((r) => r.prediction.reasoning.keyFactors);
  // Deduplicate by lowercasing and comparing
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const factor of allFactors) {
    const key = factor.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(factor);
    }
  }
  return unique.slice(0, 5);
};

/**
 * Aggregate risk factors from multiple model predictions.
 * Deduplicates and takes top 3.
 */
const aggregateRisks = (
  results: Array<{ prediction: PredictionOutput }>,
): string[] => {
  const allRisks = results.flatMap((r) => r.prediction.reasoning.risks);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const risk of allRisks) {
    const key = risk.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(risk);
    }
  }
  return unique.slice(0, 3);
};

/**
 * Aggregate reasoning summaries from agreeing models.
 */
const aggregateReasoning = (
  results: Array<{ prediction: PredictionOutput }>,
): string => {
  return results
    .map((r) => r.prediction.reasoning.summary)
    .join(' | ')
    .slice(0, 1000);
};

/**
 * Query a single model using structured output (generateObject).
 */
const queryWithLayer = (
  name: string,
  // biome-ignore lint/suspicious/noExplicitAny: Effect Layer types are complex
  layer: Layer.Layer<LanguageModel.LanguageModel, any, any>,
  systemPrompt: string,
  userPrompt: string,
) =>
  Effect.gen(function* () {
    const startTime = Date.now();

    const result = yield* Effect.gen(function* () {
      const model = yield* LanguageModel.LanguageModel;
      // Use message array format to include system prompt
      const response = yield* model.generateObject({
        prompt: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ],
        schema: PredictionOutputSchema,
        objectName: 'prediction',
      });
      return response;
    }).pipe(
      Effect.provide(layer),
      Effect.timeout(Duration.seconds(120)),
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
      modelName: name,
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
    // Build list of available models based on API keys
    const models: Array<{
      name: string;
      // biome-ignore lint/suspicious/noExplicitAny: Effect Layer types are complex
      layer: Layer.Layer<LanguageModel.LanguageModel, any, any>;
    }> = [];

    if (process.env.ANTHROPIC_KEY) {
      models.push({
        name: 'claude-sonnet-4',
        layer: PrimaryModelLayer,
      });
    }

    if (process.env.OPENAI_KEY) {
      models.push({
        name: 'gpt-4o',
        layer: OpenAiLayer,
      });
    }

    if (process.env.GEMINI_KEY) {
      models.push({
        name: 'gemini-1.5-pro',
        layer: GoogleLayer,
      });
    }

    if (models.length === 0) {
      console.warn('No AI models configured - check API keys');
      return {
        results: [],
        consensusDecision: 'NO_TRADE' as const,
        consensusPercentage: 0,
        totalModels: 0,
        successfulModels: 0,
        voteDistribution: { YES: 0, NO: 0, NO_TRADE: 0 },
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        aggregatedKeyFactors: [],
        aggregatedRisks: [],
        aggregatedReasoning: '',
      };
    }

    console.log(`Querying ${models.length} models with structured output...`);
    const startTime = Date.now();

    // Retry schedule: exponential backoff starting at 1s, max 3 retries
    const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
      Schedule.intersect(Schedule.recurs(3)),
    );

    // Query all models with limited concurrency and retry on transient failures
    const results = yield* Effect.all(
      models.map(({ name, layer }) =>
        queryWithLayer(name, layer, systemPrompt, userPrompt).pipe(
          Effect.retry(retrySchedule),
        ),
      ),
      { concurrency: 3 },
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

    return calculateConsensus(results);
  });
