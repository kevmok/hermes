import { Schema } from "effect";
import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";
import { Duration, Effect, Layer } from "effect";
import * as Redacted from "effect/Redacted";

/**
 * Schema for AI-powered market filtering.
 * Returns true/false for whether to include the market.
 */
export const MarketFilterOutputSchema = Schema.Struct({
  shouldInclude: Schema.Boolean.annotations({
    description:
      "Whether the market should be included for analysis (true) or filtered out (false)",
  }),

  category: Schema.Literal(
    "crypto",
    "sports",
    "entertainment",
    "politics",
    "economics",
    "technology",
    "other",
  ).annotations({
    description: "The detected category of the market",
  }),

  emotionalLevel: Schema.Literal("high", "medium", "low").annotations({
    description:
      "How emotionally charged/volatile the market topic is (high = filter out)",
  }),

  reason: Schema.String.annotations({
    description: "Brief explanation for the filtering decision (max 100 chars)",
  }),
});

export type MarketFilterOutput = typeof MarketFilterOutputSchema.Type;

/**
 * Filter model - google/gemini-2.0-flash-exp:free for reliable structured output.
 */
const FILTER_MODEL = "google/gemini-2.0-flash-exp:free" as const;

/**
 * Create the filter model layer.
 */
const createFilterModelLayer = (): Layer.Layer<
  LanguageModel.LanguageModel,
  never,
  never
> | null => {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  const clientLayer = OpenRouterClient.layer({
    apiKey: Redacted.make(process.env.OPENROUTER_API_KEY),
    title: "Lofn Market Filter",
  });

  const baseLayer = Layer.provide(clientLayer, FetchHttpClient.layer);
  const modelLayer = OpenRouterLanguageModel.layer({ model: FILTER_MODEL });

  return Layer.provideMerge(modelLayer, baseLayer);
};

/**
 * AI-powered market filter using structured output.
 * Filters out high-emotional markets like crypto and sports.
 */
export const filterMarketWithAI = (market: {
  title: string;
  eventSlug: string;
}) =>
  Effect.gen(function* () {
    const filterLayer = createFilterModelLayer();

    // If no API key, default to include (rely on keyword filter)
    if (!filterLayer) {
      return {
        shouldInclude: true,
        category: "other" as const,
        emotionalLevel: "low" as const,
        reason: "AI filter not configured",
      };
    }

    const systemPrompt = `You are a market filter for a prediction market trading system.
Your job is to classify markets and determine if they should be included for AI analysis.

FILTER OUT (shouldInclude: false) markets that are:
- Cryptocurrency related (Bitcoin, Ethereum, any token prices, crypto adoption)
- Sports related (NFL, NBA, MLB, NHL, UFC, soccer, tennis, any team/player performance)
- Entertainment gossip (celebrity drama, reality TV outcomes)
- High emotional volatility (fan-driven, tribal, meme-based)

INCLUDE (shouldInclude: true) markets that are:
- Politics (elections, policy outcomes, geopolitical events)
- Economics (Fed rates, inflation, GDP, employment)
- Technology (product launches, company milestones, AI developments)
- Science/Health (research outcomes, FDA approvals)
- Business (mergers, IPOs, earnings)

Set emotionalLevel to "high" for crypto/sports/entertainment, "medium" for partisan politics, "low" for economics/business.`;

    const userPrompt = `Classify this prediction market:

Title: ${market.title}
Event Slug: ${market.eventSlug}

Should this market be included for analysis?`;

    const result = yield* Effect.gen(function* () {
      const lm = yield* LanguageModel.LanguageModel;
      const response = yield* lm.generateObject({
        prompt: [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt },
        ],
        schema: MarketFilterOutputSchema,
        objectName: "filter",
      });
      return response;
    }).pipe(
      Effect.provide(filterLayer),
      Effect.timeout(Duration.seconds(10)),
      Effect.catchAll((error) => {
        console.warn("AI filter failed, defaulting to include:", String(error));
        return Effect.succeed({
          value: {
            shouldInclude: true,
            category: "other" as const,
            emotionalLevel: "low" as const,
            reason: "AI filter error, defaulting to include",
          } as MarketFilterOutput,
        });
      }),
    );

    return result.value;
  });

/**
 * Run the AI filter synchronously (for use in existing filter pipeline).
 * Returns a promise that resolves to the filter result.
 */
export const runAIFilter = (market: {
  title: string;
  eventSlug: string;
}): Promise<MarketFilterOutput> => {
  return Effect.runPromise(filterMarketWithAI(market));
};
