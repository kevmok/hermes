import { LanguageModel } from "@effect/ai";
import { env } from "bun";
import { Context, Duration, Effect, Layer, Schedule } from "effect";
import { PrimaryModelLayer, OpenAiLayer, GoogleLayer } from "./models";

export interface SwarmResult {
  modelName: string;
  decision: "YES" | "NO" | "NO_TRADE";
  reasoning: string;
  responseTimeMs: number;
  error?: string;
}

export interface SwarmResponse {
  results: SwarmResult[];
  consensusDecision: "YES" | "NO" | "NO_TRADE";
  consensusPercentage: number;
  totalModels: number;
  successfulModels: number;
}

// Parse decision from model response text
const parseDecision = (text: string): "YES" | "NO" | "NO_TRADE" => {
  const upper = text.toUpperCase();
  if (
    upper.includes('"YES"') ||
    upper.includes("DECISION: YES") ||
    upper.includes('"DECISION":"YES"') ||
    upper.includes('"DECISION": "YES"')
  ) {
    return "YES";
  }
  if (
    upper.includes('"NO"') ||
    upper.includes("DECISION: NO") ||
    upper.includes('"DECISION":"NO"') ||
    upper.includes('"DECISION": "NO"')
  ) {
    // Make sure it's not "NO_TRADE"
    if (!upper.includes("NO_TRADE")) {
      return "NO";
    }
  }
  return "NO_TRADE";
};

// Calculate consensus from results
const calculateConsensus = (results: SwarmResult[]): SwarmResponse => {
  const successfulResults = results.filter((r) => !r.error);
  const tradingResults = successfulResults.filter((r) => r.decision !== "NO_TRADE");

  let consensusDecision: "YES" | "NO" | "NO_TRADE" = "NO_TRADE";
  let consensusPercentage = 0;

  if (tradingResults.length > 0) {
    const yesCount = tradingResults.filter((r) => r.decision === "YES").length;
    const noCount = tradingResults.filter((r) => r.decision === "NO").length;

    if (yesCount > noCount) {
      consensusDecision = "YES";
      consensusPercentage = (yesCount / tradingResults.length) * 100;
    } else if (noCount > yesCount) {
      consensusDecision = "NO";
      consensusPercentage = (noCount / tradingResults.length) * 100;
    } else {
      consensusDecision = "NO_TRADE";
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

export class SwarmService extends Context.Tag("SwarmService")<
  SwarmService,
  {
    readonly query: (
      systemPrompt: string,
      userPrompt: string,
    ) => Effect.Effect<SwarmResponse, never>;
  }
>() {}

// Query a single model and return result
const queryWithLayer = (
  name: string,
  layer: Layer.Layer<LanguageModel.LanguageModel, unknown, never>,
  systemPrompt: string,
  userPrompt: string,
): Effect.Effect<SwarmResult, never> =>
  Effect.gen(function* () {
    const startTime = Date.now();

    const result = yield* Effect.gen(function* () {
      const model = yield* LanguageModel.LanguageModel;
      const response = yield* model.generateText({
        prompt: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return response;
    }).pipe(
      Effect.provide(layer),
      Effect.timeout(Duration.seconds(120)),
      Effect.catchAll((error) =>
        Effect.succeed({
          text: "",
          error: String(error),
        }),
      ),
    );

    const responseTimeMs = Date.now() - startTime;
    const text = result.text;
    const error = (result as { error?: string }).error;

    return {
      modelName: name,
      decision: error ? "NO_TRADE" : parseDecision(text),
      reasoning: text.slice(0, 500),
      responseTimeMs,
      error,
    };
  });

// SwarmService implementation - uses layers from models.ts
const make = Effect.sync(() => {
  // Build list of available models based on API keys
  // Layers are imported from models.ts - no duplication
  const models: Array<{
    name: string;
    layer: Layer.Layer<LanguageModel.LanguageModel, unknown, never>;
  }> = [];

  if (env.ANTHROPIC_KEY) {
    models.push({
      name: "claude-sonnet-4",
      layer: PrimaryModelLayer,
    });
  }

  if (env.OPENAI_KEY) {
    models.push({
      name: "gpt-4o",
      layer: OpenAiLayer,
    });
  }

  if (env.GEMINI_KEY) {
    models.push({
      name: "gemini-1.5-pro",
      layer: GoogleLayer,
    });
  }

  console.log(
    `SwarmService initialized with ${models.length} models: ${models.map((m) => m.name).join(", ")}`,
  );

  const query = (systemPrompt: string, userPrompt: string): Effect.Effect<SwarmResponse, never> =>
    Effect.gen(function* () {
      if (models.length === 0) {
        console.warn("No AI models configured - check API keys");
        return {
          results: [],
          consensusDecision: "NO_TRADE" as const,
          consensusPercentage: 0,
          totalModels: 0,
          successfulModels: 0,
        };
      }

      console.log(`Querying ${models.length} models...`);
      const startTime = Date.now();

      // Retry schedule: exponential backoff starting at 1s, max 3 retries
      const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
        Schedule.intersect(Schedule.recurs(3)),
      );

      // Query all models with limited concurrency and retry on transient failures
      const results = yield* Effect.all(
        models.map(({ name, layer }) =>
          queryWithLayer(name, layer, systemPrompt, userPrompt).pipe(Effect.retry(retrySchedule)),
        ),
        { concurrency: 3 }, // Limit concurrent AI API calls
      );

      const totalTime = Date.now() - startTime;
      console.log(`All models responded in ${totalTime}ms`);

      // Log individual results
      for (const result of results) {
        const status = result.error ? `ERROR: ${result.error.slice(0, 50)}` : result.decision;
        console.log(`  ${result.modelName}: ${status} (${result.responseTimeMs}ms)`);
      }

      return calculateConsensus(results);
    });

  return { query } as const;
});

export const SwarmLayer = Layer.effect(SwarmService, make);
