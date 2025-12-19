import { Layer } from "effect";
import * as Redacted from "effect/Redacted";
import { LanguageModel } from "@effect/ai";
import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { GoogleClient, GoogleLanguageModel } from "@effect/ai-google";
import { FetchHttpClient } from "@effect/platform";
import { env } from "bun";

// OpenAI Client and Language Model
const OpenAiClientLayer = OpenAiClient.layer({
  apiKey: env.OPENAI_KEY ? Redacted.make(env.OPENAI_KEY) : undefined,
});

const OpenAiModelLayer = OpenAiLanguageModel.layer({
  model: "gpt-4o",
});

// Anthropic Client and Language Model
const AnthropicClientLayer = AnthropicClient.layer({
  apiKey: env.ANTHROPIC_KEY ? Redacted.make(env.ANTHROPIC_KEY) : undefined,
});

const AnthropicModelLayer = AnthropicLanguageModel.layer({
  model: "claude-sonnet-4-20250514",
});

// Google Client and Language Model
const GoogleClientLayer = GoogleClient.layer({
  apiKey: env.GEMINI_KEY ? Redacted.make(env.GEMINI_KEY) : undefined,
});

const GoogleModelLayer = GoogleLanguageModel.layer({
  model: "gemini-1.5-pro",
});

// Primary model layer (Anthropic by default) - provides LanguageModel.LanguageModel
export const PrimaryModelLayer = Layer.provideMerge(
  AnthropicModelLayer,
  AnthropicClientLayer
).pipe(Layer.provide(FetchHttpClient.layer));

// OpenAI model layer
export const OpenAiLayer = Layer.provideMerge(
  OpenAiModelLayer,
  OpenAiClientLayer
).pipe(Layer.provide(FetchHttpClient.layer));

// Google model layer
export const GoogleLayer = Layer.provideMerge(
  GoogleModelLayer,
  GoogleClientLayer
).pipe(Layer.provide(FetchHttpClient.layer));

export { LanguageModel };
