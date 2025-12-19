import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============ MARKETS ============

  markets: defineTable({
    polymarketId: v.string(), // External Polymarket condition ID
    conditionId: v.optional(v.string()), // Polymarket condition ID for trading
    eventSlug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    currentYesPrice: v.number(),
    currentNoPrice: v.number(),
    volume24h: v.number(),
    totalVolume: v.number(),
    isActive: v.boolean(),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTradeAt: v.number(),
    lastAnalyzedAt: v.optional(v.number()),
  })
    .index('by_polymarket_id', ['polymarketId'])
    .index('by_event_slug', ['eventSlug'])
    .index('by_active', ['isActive'])
    .index('by_volume', ['volume24h'])
    .index('by_last_trade', ['lastTradeAt'])
    .index('by_last_analyzed', ['lastAnalyzedAt'])
    .index('by_category', ['category']),

  marketSnapshots: defineTable({
    marketId: v.id('markets'),
    yesPrice: v.number(),
    noPrice: v.number(),
    volume: v.number(),
    timestamp: v.number(),
  })
    .index('by_market', ['marketId'])
    .index('by_market_time', ['marketId', 'timestamp'])
    .index('by_timestamp', ['timestamp']),

  // ============ ANALYSIS & INSIGHTS ============

  analysisRuns: defineTable({
    runId: v.string(), // Human-readable run ID like "run_1234_abc"
    triggerType: v.union(
      v.literal('scheduled'),
      v.literal('on_demand'),
      v.literal('system'),
    ),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    marketsAnalyzed: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_run_id', ['runId'])
    .index('by_status', ['status'])
    .index('by_trigger_type', ['triggerType'])
    .index('by_started_at', ['startedAt']),

  modelPredictions: defineTable({
    analysisRunId: v.id('analysisRuns'),
    marketId: v.id('markets'),
    modelName: v.string(), // "claude-sonnet-4", "gpt-4o", "gemini-1.5-pro"
    decision: v.union(v.literal('YES'), v.literal('NO'), v.literal('NO_TRADE')),
    reasoning: v.string(),
    responseTimeMs: v.number(),
    confidence: v.optional(v.number()), // 0-100
    timestamp: v.number(),
  })
    .index('by_run', ['analysisRunId'])
    .index('by_market', ['marketId'])
    .index('by_run_market', ['analysisRunId', 'marketId'])
    .index('by_model', ['modelName'])
    .index('by_timestamp', ['timestamp']),

  insights: defineTable({
    analysisRunId: v.id('analysisRuns'),
    marketId: v.id('markets'),
    consensusDecision: v.union(
      v.literal('YES'),
      v.literal('NO'),
      v.literal('NO_TRADE'),
    ),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(),
    aggregatedReasoning: v.string(),
    confidenceLevel: v.union(
      v.literal('high'),
      v.literal('medium'),
      v.literal('low'),
    ),
    isHighConfidence: v.boolean(), // >= 66% consensus
    priceAtAnalysis: v.number(),
    timestamp: v.number(),
  })
    .index('by_run', ['analysisRunId'])
    .index('by_market', ['marketId'])
    .index('by_market_time', ['marketId', 'timestamp'])
    .index('by_high_confidence', ['isHighConfidence', 'timestamp'])
    .index('by_confidence_level', ['confidenceLevel'])
    .index('by_timestamp', ['timestamp']),

  // ============ ANALYSIS REQUESTS (for on-demand) ============

  analysisRequests: defineTable({
    marketId: v.id('markets'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    insightId: v.optional(v.id('insights')),
    errorMessage: v.optional(v.string()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_market', ['marketId'])
    .index('by_status', ['status'])
    .index('by_requested_at', ['requestedAt']),

  // ============ WATCHLISTS ============

  watchlists: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index('by_default', ['isDefault']),

  watchlistItems: defineTable({
    watchlistId: v.id('watchlists'),
    marketId: v.id('markets'),
    addedAt: v.number(),
  })
    .index('by_watchlist', ['watchlistId'])
    .index('by_market', ['marketId'])
    .index('by_watchlist_market', ['watchlistId', 'marketId']),
});
