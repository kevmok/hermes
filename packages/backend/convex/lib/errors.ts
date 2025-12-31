import { Data } from "effect";

/**
 * Error for Convex query failures
 */
export class ConvexQueryError extends Data.TaggedError("ConvexQueryError")<{
  operation: string;
  message: string;
  cause?: unknown;
}> {}

/**
 * Error for Convex mutation failures
 */
export class ConvexMutationError extends Data.TaggedError(
  "ConvexMutationError",
)<{
  operation: string;
  message: string;
  cause?: unknown;
}> {}

/**
 * Error for Polymarket API failures
 */
export class PolymarketApiError extends Data.TaggedError("PolymarketApiError")<{
  endpoint: string;
  status?: number;
  message: string;
}> {}

/**
 * Error for AI model failures
 */
export class AIModelError extends Data.TaggedError("AIModelError")<{
  model: string;
  message: string;
  isRetryable: boolean;
}> {}

/**
 * Error for market not found
 */
export class MarketNotFoundError extends Data.TaggedError(
  "MarketNotFoundError",
)<{
  marketId: string;
}> {}

/**
 * Error for signal not found
 */
export class SignalNotFoundError extends Data.TaggedError(
  "SignalNotFoundError",
)<{
  signalId: string;
}> {}

/**
 * Error for invalid configuration
 */
export class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
  setting: string;
  message: string;
}> {}
