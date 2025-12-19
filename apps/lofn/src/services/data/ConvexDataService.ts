import { Context, Effect, Layer } from 'effect';
import type { Id } from 'backend/convex/_generated/dataModel';

const CONVEX_URL = process.env.CONVEX_URL;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;

if (!CONVEX_URL) {
  throw new Error('CONVEX_URL environment variable is required');
}

// Helper to make authenticated requests to Convex
const convexFetch = async <T>(
  endpoint: 'mutation' | 'query',
  path: string,
  args: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(`${CONVEX_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CONVEX_DEPLOY_KEY && {
        Authorization: `Convex ${CONVEX_DEPLOY_KEY}`,
      }),
    },
    body: JSON.stringify({ path, args }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Convex ${endpoint} failed: ${error}`);
  }

  const result = await response.json();
  return result.value as T;
};

export interface MarketData {
  polymarketId: string;
  conditionId?: string;
  eventSlug: string;
  title: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
  totalVolume: number;
  isActive: boolean;
  endDate?: number;
}

export interface ModelPredictionData {
  analysisRunId: Id<'analysisRuns'>;
  marketId: Id<'markets'>;
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  reasoning: string;
  responseTimeMs: number;
  confidence?: number;
}

export interface InsightData {
  analysisRunId: Id<'analysisRuns'>;
  marketId: Id<'markets'>;
  consensusDecision: 'YES' | 'NO' | 'NO_TRADE';
  consensusPercentage: number;
  totalModels: number;
  agreeingModels: number;
  aggregatedReasoning: string;
  priceAtAnalysis: number;
}

export interface MarketForAnalysis {
  _id: Id<'markets'>;
  polymarketId: string;
  title: string;
  eventSlug: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
}

export class ConvexDataService extends Context.Tag('ConvexDataService')<
  ConvexDataService,
  {
    readonly upsertMarket: (
      market: MarketData,
    ) => Effect.Effect<Id<'markets'>, Error>;
    readonly upsertMarketsBatch: (
      markets: MarketData[],
    ) => Effect.Effect<Id<'markets'>[], Error>;
    readonly recordSnapshot: (
      marketId: Id<'markets'>,
      yesPrice: number,
      noPrice: number,
      volume: number,
    ) => Effect.Effect<Id<'marketSnapshots'>, Error>;
    readonly getMarketsForAnalysis: (
      limit: number,
    ) => Effect.Effect<MarketForAnalysis[], Error>;
    readonly createAnalysisRun: (
      triggerType: 'scheduled' | 'on_demand' | 'system',
    ) => Effect.Effect<Id<'analysisRuns'>, Error>;
    readonly updateAnalysisRun: (
      runId: Id<'analysisRuns'>,
      status: 'pending' | 'running' | 'completed' | 'failed',
      marketsAnalyzed?: number,
      errorMessage?: string,
    ) => Effect.Effect<void, Error>;
    readonly saveModelPrediction: (
      data: ModelPredictionData,
    ) => Effect.Effect<Id<'modelPredictions'>, Error>;
    readonly saveInsight: (
      data: InsightData,
    ) => Effect.Effect<Id<'insights'>, Error>;
    readonly markMarketAnalyzed: (
      marketId: Id<'markets'>,
    ) => Effect.Effect<void, Error>;
  }
>() {}

const make = Effect.sync(() => {
  const upsertMarket = (market: MarketData) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'markets'>>(
          'mutation',
          'markets:upsertMarket',
          market as unknown as Record<string, unknown>,
        ),
      catch: (e) => new Error(`Failed to upsert market: ${e}`),
    });

  const upsertMarketsBatch = (markets: MarketData[]) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'markets'>[]>('mutation', 'markets:upsertMarketsBatch', {
          markets,
        }),
      catch: (e) => new Error(`Failed to batch upsert markets: ${e}`),
    });

  const recordSnapshot = (
    marketId: Id<'markets'>,
    yesPrice: number,
    noPrice: number,
    volume: number,
  ) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'marketSnapshots'>>(
          'mutation',
          'markets:recordSnapshot',
          {
            marketId,
            yesPrice,
            noPrice,
            volume,
          },
        ),
      catch: (e) => new Error(`Failed to record snapshot: ${e}`),
    });

  const getMarketsForAnalysis = (limit: number) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<MarketForAnalysis[]>(
          'query',
          'markets:getMarketsNeedingAnalysis',
          { limit, minHoursSinceLastAnalysis: 6 },
        ),
      catch: (e) => new Error(`Failed to get markets for analysis: ${e}`),
    });

  const createAnalysisRun = (
    triggerType: 'scheduled' | 'on_demand' | 'system',
  ) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'analysisRuns'>>(
          'mutation',
          'analysis:createAnalysisRun',
          {
            triggerType,
          },
        ),
      catch: (e) => new Error(`Failed to create analysis run: ${e}`),
    });

  const updateAnalysisRun = (
    runId: Id<'analysisRuns'>,
    status: 'pending' | 'running' | 'completed' | 'failed',
    marketsAnalyzed?: number,
    errorMessage?: string,
  ) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<void>('mutation', 'analysis:updateAnalysisRun', {
          runId,
          status,
          marketsAnalyzed,
          errorMessage,
        }),
      catch: (e) => new Error(`Failed to update analysis run: ${e}`),
    });

  const saveModelPrediction = (data: ModelPredictionData) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'modelPredictions'>>(
          'mutation',
          'analysis:saveModelPrediction',
          data as unknown as Record<string, unknown>,
        ),
      catch: (e) => new Error(`Failed to save model prediction: ${e}`),
    });

  const saveInsight = (data: InsightData) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<Id<'insights'>>(
          'mutation',
          'analysis:saveInsight',
          data as unknown as Record<string, unknown>,
        ),
      catch: (e) => new Error(`Failed to save insight: ${e}`),
    });

  const markMarketAnalyzed = (marketId: Id<'markets'>) =>
    Effect.tryPromise({
      try: () =>
        convexFetch<void>('mutation', 'markets:markMarketAnalyzed', {
          marketId,
        }),
      catch: (e) => new Error(`Failed to mark market as analyzed: ${e}`),
    });

  return {
    upsertMarket,
    upsertMarketsBatch,
    recordSnapshot,
    getMarketsForAnalysis,
    createAnalysisRun,
    updateAnalysisRun,
    saveModelPrediction,
    saveInsight,
    markMarketAnalyzed,
  };
});

export const ConvexDataLayer = Layer.effect(ConvexDataService, make);
