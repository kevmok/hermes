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
  // ============ EVENTS (Derived from trades) ============

  events: defineTable({
    eventSlug: v.string(), // Primary identifier (unique)
    title: v.string(), // Event title (from trade's market title)
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    firstTradeAt: v.number(),
    lastTradeAt: v.number(),
    tradeCount: v.number(),
    totalVolume: v.number(), // Sum of all trade sizes for this event
    // Resolution tracking
    closed: v.optional(v.boolean()), // Event has closed on Polymarket
    resolvedAt: v.optional(v.number()), // When we detected closure
  })
    .index("by_event_slug", ["eventSlug"])
    .index("by_last_trade", ["lastTradeAt"])
    .index("by_active", ["isActive", "lastTradeAt"])
    .index("by_volume", ["totalVolume"])
    .index("by_closed", ["closed"]),

  // ============ MARKETS (Simplified - static data only) ============

  markets: defineTable({
    polymarketId: v.string(), // External Polymarket condition ID
    conditionId: v.optional(v.string()), // Polymarket condition ID for trading
    slug: v.string(), // Market slug for API lookups
    eventSlug: v.string(),
    title: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
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
  })
    .index("by_polymarket_id", ["polymarketId"])
    .index("by_slug", ["slug"])
    .index("by_event_slug", ["eventSlug"])
    .index("by_active", ["isActive"])
    .index("by_last_trade", ["lastTradeAt"])
    .index("by_last_analyzed", ["lastAnalyzedAt"])
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

  // ============ TRADES (Raw WebSocket data) ============

  trades: defineTable({
    // Market identification (for API lookups - no stale data)
    conditionId: v.string(),
    slug: v.string(),
    eventSlug: v.string(),
    title: v.string(), // Market title for display

    // Trade data
    side: v.union(v.literal("BUY"), v.literal("SELL")),
    size: v.number(), // Trade size in USD
    price: v.number(), // Trade price (0-1)
    timestamp: v.number(), // Unix timestamp in seconds
    proxyWallet: v.string(), // Trader wallet address
    outcome: v.string(), // Outcome name (Yes/No/Up/Down)
    outcomeIndex: v.number(), // Outcome index (0 or 1)
    transactionHash: v.optional(v.string()), // On-chain tx hash

    // Whale tracking
    isWhale: v.boolean(), // True if size >= threshold

    // Optional signal reference (if trade triggered a signal)
    signalId: v.optional(v.id("signals")),

    // Optional trader info (may not always be available)
    traderName: v.optional(v.string()),
    traderPseudonym: v.optional(v.string()),
  })
    .index("by_condition_id", ["conditionId"])
    .index("by_slug", ["slug"])
    .index("by_event_slug", ["eventSlug"])
    .index("by_timestamp", ["timestamp"])
    .index("by_whale", ["isWhale", "timestamp"])
    .index("by_wallet", ["proxyWallet", "timestamp"])
    .index("by_signal", ["signalId"])
    .index("by_condition_time", ["conditionId", "timestamp"]),

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

    signalTimestamp: v.number(),

    edgeScore: v.optional(v.number()),
    marketCategory: v.optional(v.string()),
  })
    .index("by_market", ["marketId"])
    .index("by_timestamp", ["signalTimestamp"])
    .index("by_decision", ["consensusDecision", "signalTimestamp"])
    .index("by_high_confidence", ["isHighConfidence", "signalTimestamp"])
    .index("by_market_time", ["marketId", "signalTimestamp"])
    .index("by_category", ["marketCategory", "signalTimestamp"]),

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
    minTradeSize: v.number(),
    maxPriceYes: v.number(),
    minPriceYes: v.number(),
    minVolume24h: v.number(),
    excludedCategories: v.array(v.string()),
    deduplicationWindowMs: v.number(),
    minConsensusPercentage: v.number(),
    isEnabled: v.boolean(),
    updatedAt: v.number(),
  }),

  userPreferences: defineTable({
    userId: v.id("user"),
    emailAlerts: v.boolean(),
    alertThreshold: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("all"),
    ),
    categories: v.array(v.string()),
    digestFrequency: v.union(
      v.literal("instant"),
      v.literal("daily"),
      v.literal("weekly"),
    ),
    digestHourUTC: v.number(),
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_digest", ["digestFrequency", "digestHourUTC"]),

  alertLog: defineTable({
    userId: v.id("user"),
    signalId: v.id("signals"),
    channel: v.union(v.literal("email"), v.literal("digest")),
    sentAt: v.number(),
    opened: v.optional(v.boolean()),
    clicked: v.optional(v.boolean()),
  })
    .index("by_user", ["userId", "sentAt"])
    .index("by_signal", ["signalId"])
    .index("by_user_signal", ["userId", "signalId"]),

  userPortfolio: defineTable({
    userId: v.id("user"),
    polymarketAddress: v.string(),
    nickname: v.optional(v.string()),
    addedAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
    lastSyncStatus: v.optional(
      v.union(
        v.literal("success"),
        v.literal("failed"),
        v.literal("no_positions"),
      ),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_address", ["polymarketAddress"]),

  // ============ PHASE 3: MARKET INTELLIGENCE ============

  // User credit tracking for deep dives
  userCredits: defineTable({
    userId: v.id("user"),
    deepDiveCredits: v.number(),
    monthlyAllocation: v.number(), // Credits given per month based on plan
    lastRefreshedAt: v.number(), // When credits were last refreshed
    totalUsed: v.number(), // Lifetime usage
  }).index("by_user", ["userId"]),

  // Deep dive requests and results
  deepDiveRequests: defineTable({
    userId: v.id("user"),
    marketId: v.id("markets"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
    creditsCharged: v.number(),

    // Result data (populated when completed)
    result: v.optional(
      v.object({
        newsItems: v.array(
          v.object({
            title: v.string(),
            url: v.string(),
            source: v.string(),
            summary: v.string(),
            sentiment: v.union(
              v.literal("positive"),
              v.literal("negative"),
              v.literal("neutral"),
            ),
            publishedAt: v.optional(v.number()),
          }),
        ),
        socialSentiment: v.object({
          score: v.number(), // -1 to 1
          volume: v.string(), // High, Medium, Low
          topOpinions: v.array(v.string()),
        }),
        relatedMarkets: v.array(
          v.object({
            marketId: v.id("markets"),
            title: v.string(),
            correlation: v.string(), // Description of relationship
          }),
        ),
        historicalContext: v.string(),
        updatedAnalysis: v.string(),
        citations: v.array(v.string()),
      }),
    ),

    errorMessage: v.optional(v.string()),
  })
    .index("by_user", ["userId", "requestedAt"])
    .index("by_market", ["marketId", "requestedAt"])
    .index("by_status", ["status"]),

  // Whale profiles for smart money tracking
  whaleProfiles: defineTable({
    address: v.string(), // Wallet address
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),

    // Activity stats
    totalTrades: v.number(),
    totalVolume: v.number(),
    avgTradeSize: v.number(),

    // Performance (on resolved markets)
    resolvedTrades: v.number(),
    correctPredictions: v.number(),
    winRate: v.optional(v.number()), // Only calculated with 10+ resolved

    // Classification
    isSmartMoney: v.boolean(), // winRate > 60% with 10+ resolved
    preferredCategories: v.array(v.string()),

    // Metadata (from Polymarket if available)
    username: v.optional(v.string()),
    profileImage: v.optional(v.string()),
  })
    .index("by_address", ["address"])
    .index("by_smart_money", ["isSmartMoney", "totalVolume"])
    .index("by_volume", ["totalVolume"]),

  // ============ PHASE 4: ENGAGEMENT & ACTIVITY ============

  userActivity: defineTable({
    userId: v.id("user"),
    signalsViewed: v.number(),
    deepDivesUsed: v.number(),
    sharesGenerated: v.number(),
    daysActive: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveAt: v.number(),
    badges: v.array(v.string()),
  }).index("by_user", ["userId"]),
});
