import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ AUTHENTICATION ============
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    role: v.optional(v.union(v.null(), v.string())),
    banned: v.optional(v.union(v.null(), v.boolean())),
    banReason: v.optional(v.union(v.null(), v.string())),
    banExpires: v.optional(v.union(v.null(), v.number())),
    userId: v.optional(v.union(v.null(), v.string())),
    // Signal notification tracking
    lastSeenSignalsAt: v.optional(v.number()),
  })
    .index("email_name", ["email", "name"])
    .index("name", ["name"])
    .index("userId", ["userId"]),
  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
    impersonatedBy: v.optional(v.union(v.null(), v.string())),
  })
    .index("expiresAt", ["expiresAt"])
    .index("expiresAt_userId", ["expiresAt", "userId"])
    .index("token", ["token"])
    .index("userId", ["userId"]),
  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("providerId_userId", ["providerId", "userId"])
    .index("userId", ["userId"]),
  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("identifier", ["identifier"]),
  jwks: defineTable({
    publicKey: v.string(),
    privateKey: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.union(v.null(), v.number())),
  }),
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

    // Outcome tracking fields for performance measurement
    outcome: v.optional(
      v.union(
        v.literal("YES"),
        v.literal("NO"),
        v.literal("INVALID"),
        v.null(),
      ),
    ),
    resolvedAt: v.optional(v.number()),
    resolutionSource: v.optional(v.string()),
  })
    .index("by_polymarket_id", ["polymarketId"])
    .index("by_event_slug", ["eventSlug"])
    .index("by_active", ["isActive"])
    .index("by_volume", ["volume24h"])
    .index("by_last_trade", ["lastTradeAt"])
    .index("by_last_analyzed", ["lastAnalyzedAt"])
    .index("by_category", ["category"])
    .index("by_resolved", ["outcome", "resolvedAt"]),

  marketSnapshots: defineTable({
    marketId: v.id("markets"),
    yesPrice: v.number(),
    noPrice: v.number(),
    volume: v.number(),
    timestamp: v.number(),
  })
    .index("by_market", ["marketId"])
    .index("by_market_time", ["marketId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // ============ ANALYSIS & INSIGHTS ============

  analysisRuns: defineTable({
    runId: v.string(), // Human-readable run ID like "run_1234_abc"
    triggerType: v.union(
      v.literal("scheduled"),
      v.literal("on_demand"),
      v.literal("system"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    marketsAnalyzed: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_run_id", ["runId"])
    .index("by_status", ["status"])
    .index("by_trigger_type", ["triggerType"])
    .index("by_started_at", ["startedAt"]),

  modelPredictions: defineTable({
    analysisRunId: v.id("analysisRuns"),
    marketId: v.id("markets"),
    modelName: v.string(), // "claude-sonnet-4", "gpt-4o", "gemini-1.5-pro"
    decision: v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
    reasoning: v.string(),
    responseTimeMs: v.number(),
    confidence: v.optional(v.number()), // 0-100
    timestamp: v.number(),
  })
    .index("by_run", ["analysisRunId"])
    .index("by_market", ["marketId"])
    .index("by_run_market", ["analysisRunId", "marketId"])
    .index("by_model", ["modelName"])
    .index("by_timestamp", ["timestamp"]),

  insights: defineTable({
    analysisRunId: v.optional(v.id("analysisRuns")), // Optional - only set for tracked runs
    marketId: v.id("markets"),
    consensusDecision: v.union(
      v.literal("YES"),
      v.literal("NO"),
      v.literal("NO_TRADE"),
    ),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(),
    aggregatedReasoning: v.string(),
    confidenceLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    isHighConfidence: v.boolean(), // >= 66% consensus
    priceAtAnalysis: v.number(),
    timestamp: v.number(),
  })
    .index("by_run", ["analysisRunId"])
    .index("by_market", ["marketId"])
    .index("by_market_time", ["marketId", "timestamp"])
    .index("by_high_confidence", ["isHighConfidence", "timestamp"])
    .index("by_confidence_level", ["confidenceLevel"])
    .index("by_timestamp", ["timestamp"]),

  // ============ SIGNALS (Whale Trade-Triggered AI Consensus) ============

  signals: defineTable({
    marketId: v.id("markets"),

    // Trigger trade details (single trade or aggregated array)
    triggerTrade: v.union(
      // Single trade
      v.object({
        size: v.number(), // Already in USD from Polymarket
        price: v.number(),
        side: v.union(v.literal("YES"), v.literal("NO")),
        taker: v.optional(v.string()),
        timestamp: v.number(),
      }),
      // Multiple trades aggregated within dedup window
      v.array(
        v.object({
          size: v.number(),
          price: v.number(),
          side: v.union(v.literal("YES"), v.literal("NO")),
          taker: v.optional(v.string()),
          timestamp: v.number(),
        }),
      ),
    ),

    // AI consensus results
    consensusDecision: v.union(
      v.literal("YES"),
      v.literal("NO"),
      v.literal("NO_TRADE"),
    ),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(), // Kept for backwards compatibility
    aggregatedReasoning: v.string(),
    confidenceLevel: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    isHighConfidence: v.boolean(), // 80%+ consensus
    priceAtTrigger: v.number(),

    // NEW: Vote distribution across all models
    voteDistribution: v.optional(
      v.object({
        YES: v.number(),
        NO: v.number(),
        NO_TRADE: v.number(),
      }),
    ),

    // NEW: Confidence metrics from structured outputs
    averageConfidence: v.optional(v.number()), // 0-100 average across agreeing models
    confidenceRange: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      }),
    ),

    // NEW: Structured aggregated insights
    aggregatedKeyFactors: v.optional(v.array(v.string())), // Top 5 key factors
    aggregatedRisks: v.optional(v.array(v.string())), // Top 3 risks

    // Schema version for backwards compatibility
    schemaVersion: v.optional(v.string()), // "2.0.0" for structured outputs

    // When the signal was stored
    signalTimestamp: v.number(),
  })
    .index("by_market", ["marketId"])
    .index("by_timestamp", ["signalTimestamp"])
    .index("by_decision", ["consensusDecision", "signalTimestamp"])
    .index("by_high_confidence", ["isHighConfidence", "signalTimestamp"])
    .index("by_market_time", ["marketId", "signalTimestamp"]),

  // ============ ANALYSIS REQUESTS (for on-demand) ============

  analysisRequests: defineTable({
    marketId: v.id("markets"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    insightId: v.optional(v.id("insights")),
    errorMessage: v.optional(v.string()),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_market", ["marketId"])
    .index("by_status", ["status"])
    .index("by_requested_at", ["requestedAt"]),

  // ============ WATCHLISTS ============

  watchlists: defineTable({
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  }).index("by_default", ["isDefault"]),

  watchlistItems: defineTable({
    watchlistId: v.id("watchlists"),
    marketId: v.id("markets"),
    addedAt: v.number(),
  })
    .index("by_watchlist", ["watchlistId"])
    .index("by_market", ["marketId"])
    .index("by_watchlist_market", ["watchlistId", "marketId"]),

  // ============ GLOBAL FILTERS (Singleton Config) ============

  globalFilters: defineTable({
    minTradeSize: v.number(), // Min trade size in USD (e.g., 500)
    maxPriceYes: v.number(), // Max YES price to track (e.g., 0.98)
    minPriceYes: v.number(), // Min YES price to track (e.g., 0.02)
    minVolume24h: v.number(), // Min 24h volume in USD (e.g., 10000)
    excludedCategories: v.array(v.string()), // Categories to exclude
    deduplicationWindowMs: v.number(), // Dedup window in ms (e.g., 60000)
    minConsensusPercentage: v.number(), // Min consensus to create signal (e.g., 60)
    isEnabled: v.boolean(), // Master switch for signal generation
    updatedAt: v.number(),
  }),
});
