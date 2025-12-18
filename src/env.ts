import { Effect } from "effect";
import { env } from "bun";

export interface EnvConfig {
  OPENAI_KEY: string | undefined;
  ANTHROPIC_KEY: string | undefined;
  GEMINI_KEY: string | undefined;
  GROQ_API_KEY: string | undefined;
  DEEPSEEK_KEY: string | undefined;
  XAI_API_KEY: string | undefined;
}

export const validateEnv = Effect.gen(function* () {
  const keys: EnvConfig = {
    OPENAI_KEY: env.OPENAI_KEY,
    ANTHROPIC_KEY: env.ANTHROPIC_KEY,
    GEMINI_KEY: env.GEMINI_KEY,
    GROQ_API_KEY: env.GROQ_API_KEY,
    DEEPSEEK_KEY: env.DEEPSEEK_KEY,
    XAI_API_KEY: env.XAI_API_KEY,
  };

  const configured = Object.entries(keys)
    .filter(([_, v]) => v && v.length > 0)
    .map(([k]) => k);

  if (configured.length === 0) {
    yield* Effect.fail(
      new Error(
        "No AI API keys configured. Set at least one of: OPENAI_KEY, ANTHROPIC_KEY, GEMINI_KEY"
      )
    );
  }

  console.log(`Configured AI providers: ${configured.join(", ")}`);
  return keys;
});

export const getEnvConfig = (): EnvConfig => ({
  OPENAI_KEY: env.OPENAI_KEY,
  ANTHROPIC_KEY: env.ANTHROPIC_KEY,
  GEMINI_KEY: env.GEMINI_KEY,
  GROQ_API_KEY: env.GROQ_API_KEY,
  DEEPSEEK_KEY: env.DEEPSEEK_KEY,
  XAI_API_KEY: env.XAI_API_KEY,
});
