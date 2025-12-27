import { Context, Duration, Effect, Layer, Schedule } from 'effect';
import { ConvexHttpClient } from 'convex/browser';
import { api } from 'backend/convex/_generated/api';
import type { Id } from 'backend/convex/_generated/dataModel';

const CONVEX_URL = process.env.CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error('CONVEX_URL environment variable is required');
}

// Retry schedule: exponential backoff, max 3 attempts
const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.intersect(Schedule.recurs(3)),
);

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

export interface TradeContext {
  size: number;
  price: number;
  side: 'YES' | 'NO';
  taker?: string;
  timestamp: number;
}

export interface MarketDataWithTrade extends MarketData {
  tradeContext: TradeContext;
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

export interface RawTradeData {
  conditionId: string;
  slug: string;
  eventSlug: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  timestamp: number;
  proxyWallet: string;
  outcome: string;
  outcomeIndex: number;
  transactionHash?: string;
  isWhale: boolean;
  traderName?: string;
  traderPseudonym?: string;
}

export class ConvexDataService extends Context.Tag('ConvexDataService')<
  ConvexDataService,
  {
    readonly upsertMarket: (
      market: MarketData,
    ) => Effect.Effect<Id<'markets'>, Error>;
    readonly upsertMarketWithTrade: (
      market: MarketDataWithTrade,
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
    readonly recordTrade: (
      trade: RawTradeData,
    ) => Effect.Effect<Id<'trades'>, Error>;
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
  // Singleton ConvexHttpClient - safe for long-running Bun service
  const client = new ConvexHttpClient(CONVEX_URL!);

  const upsertMarket = (market: MarketData) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.upsertMarket, market),
      catch: (e) => new Error(`Failed to upsert market: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const upsertMarketWithTrade = (market: MarketDataWithTrade) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.upsertMarketWithTrade, market),
      catch: (e) => new Error(`Failed to upsert market with trade: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const upsertMarketsBatch = (markets: MarketData[]) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.upsertMarketsBatch, { markets }),
      catch: (e) => new Error(`Failed to batch upsert markets: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const recordSnapshot = (
    marketId: Id<'markets'>,
    yesPrice: number,
    noPrice: number,
    volume: number,
  ) =>
    Effect.tryPromise({
      try: () =>
        client.mutation(api.markets.recordSnapshot, {
          marketId,
          yesPrice,
          noPrice,
          volume,
        }),
      catch: (e) => new Error(`Failed to record snapshot: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const recordTrade = (trade: RawTradeData) =>
    Effect.tryPromise({
      try: () => client.mutation(api.trades.recordTrade, trade),
      catch: (e) => new Error(`Failed to record trade: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const getMarketsForAnalysis = (limit: number) =>
    Effect.tryPromise({
      try: () =>
        client.query(api.markets.getMarketsNeedingAnalysis, {
          limit,
          minHoursSinceLastAnalysis: 6,
        }),
      catch: (e) => new Error(`Failed to get markets for analysis: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const createAnalysisRun = (
    triggerType: 'scheduled' | 'on_demand' | 'system',
  ) =>
    Effect.tryPromise({
      try: () =>
        client.mutation(api.analysis.createAnalysisRun, { triggerType }),
      catch: (e) => new Error(`Failed to create analysis run: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const updateAnalysisRun = (
    runId: Id<'analysisRuns'>,
    status: 'pending' | 'running' | 'completed' | 'failed',
    marketsAnalyzed?: number,
    errorMessage?: string,
  ) =>
    Effect.tryPromise({
      try: () =>
        client.mutation(api.analysis.updateAnalysisRun, {
          runId,
          status,
          marketsAnalyzed,
          errorMessage,
        }),
      catch: (e) => new Error(`Failed to update analysis run: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const saveModelPrediction = (data: ModelPredictionData) =>
    Effect.tryPromise({
      try: () => client.mutation(api.analysis.saveModelPrediction, data),
      catch: (e) => new Error(`Failed to save model prediction: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const saveInsight = (data: InsightData) =>
    Effect.tryPromise({
      try: () => client.mutation(api.analysis.saveInsight, data),
      catch: (e) => new Error(`Failed to save insight: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  const markMarketAnalyzed = (marketId: Id<'markets'>) =>
    Effect.tryPromise({
      try: () => client.mutation(api.markets.markMarketAnalyzed, { marketId }),
      catch: (e) => new Error(`Failed to mark market as analyzed: ${e}`),
    }).pipe(Effect.retry(retrySchedule));

  return {
    upsertMarket,
    upsertMarketWithTrade,
    upsertMarketsBatch,
    recordSnapshot,
    recordTrade,
    getMarketsForAnalysis,
    createAnalysisRun,
    updateAnalysisRun,
    saveModelPrediction,
    saveInsight,
    markMarketAnalyzed,
  };
});

export const ConvexDataLayer = Layer.effect(ConvexDataService, make);
