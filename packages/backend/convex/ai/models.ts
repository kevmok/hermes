import { Layer } from "effect";
import * as Redacted from "effect/Redacted";
import { LanguageModel } from "@effect/ai";
import {
  OpenRouterClient,
  OpenRouterLanguageModel,
} from "@effect/ai-openrouter";
import { FetchHttpClient } from "@effect/platform";

/**
 * Model configuration for the swarm.
 * Add or remove models here to change which AI models participate in consensus.
 */
export const SWARM_MODELS = [
  "qwen/qwen3-vl-32b-instruct",
  "google/gemini-3-flash-preview",
  "openai/gpt-5-mini",
  // "anthropic/claude-haiku-4.5",
  "z-ai/glm-4.7",
  "x-ai/grok-4.1-fast",
  "moonshotai/kimi-k2-thinking",
  "openai/gpt-oss-20b",
] as const;

export type SwarmModelId = (typeof SWARM_MODELS)[number];

/**
 * Human-readable display names for each model.
 */
export const MODEL_DISPLAY_NAMES: Record<SwarmModelId, string> = {
  "qwen/qwen3-vl-32b-instruct": "Qwen 3 VL 32B",
  "google/gemini-3-flash-preview": "Gemini 3 Pro",
  "openai/gpt-5-mini": "GPT-5 Mini",
  // "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "z-ai/glm-4.7": "GLM 4.7",
  "x-ai/grok-4.1-fast": "Grok 4.1 Fast",
  "moonshotai/kimi-k2-thinking": "Kimi K2",
  "openai/gpt-oss-20b": "GPT OSS 20B",
};

/**
 * OpenRouter client layer - shared across all models.
 * Uses OPENROUTER_API_KEY from environment.
 */
const OpenRouterClientLayer = OpenRouterClient.layer({
  apiKey: process.env.OPENROUTER_API_KEY
    ? Redacted.make(process.env.OPENROUTER_API_KEY)
    : undefined,
  title: "Lofn AI Swarm",
});

/**
 * Base layer with HTTP client for OpenRouter.
 */
const BaseLayer = Layer.provide(OpenRouterClientLayer, FetchHttpClient.layer);

/**
 * Create a language model layer for a specific OpenRouter model.
 */
export const createModelLayer = (
  modelId: string,
): Layer.Layer<LanguageModel.LanguageModel, never, never> => {
  const modelLayer = OpenRouterLanguageModel.layer({ model: modelId });
  return Layer.provideMerge(modelLayer, BaseLayer);
};

/**
 * Model factory entry with name and layer.
 */
export interface ModelEntry {
  readonly id: SwarmModelId;
  readonly displayName: string;
  readonly layer: Layer.Layer<LanguageModel.LanguageModel, never, never>;
}

/**
 * Get all configured models with their layers.
 * Only returns models if OPENROUTER_API_KEY is set.
 */
export const getConfiguredModels = (): ModelEntry[] => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set - no models available");
    return [];
  }

  return SWARM_MODELS.map((id) => ({
    id,
    displayName: MODEL_DISPLAY_NAMES[id],
    layer: createModelLayer(id),
  }));
};

/**
 * Get a subset of models by their IDs.
 * Useful for testing or running with specific models only.
 */
export const getModelsByIds = (ids: SwarmModelId[]): ModelEntry[] => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set - no models available");
    return [];
  }

  return ids.map((id) => ({
    id,
    displayName: MODEL_DISPLAY_NAMES[id],
    layer: createModelLayer(id),
  }));
};

/**
 * Check if OpenRouter is configured.
 */
export const isOpenRouterConfigured = (): boolean => {
  return !!process.env.OPENROUTER_API_KEY;
};

/**
 * Aggregation model for synthesizing results from multiple predictions.
 * Uses meta-llama/llama-3.1-8b-instruct for structured output support.
 */
export const AGGREGATION_MODEL = "meta-llama/llama-3.1-8b-instruct" as const;

/**
 * Get the aggregation model layer for synthesizing consensus results.
 */
export const getAggregationModel = (): Layer.Layer<
  LanguageModel.LanguageModel,
  never,
  never
> | null => {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }
  return createModelLayer(AGGREGATION_MODEL);
};

export { LanguageModel };
