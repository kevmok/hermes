import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// ============ TYPE DEFINITIONS ============

const tradeObjectValidator = v.object({
  size: v.number(),
  price: v.number(),
  side: v.union(v.literal("YES"), v.literal("NO")),
  taker: v.optional(v.string()),
  timestamp: v.number(),
});

// ============ MUTATIONS ============

export const createSignal = internalMutation({
  args: {
    marketId: v.id("markets"),
    triggerTrade: tradeObjectValidator,
    consensusDecision: v.union(
      v.literal("YES"),
      v.literal("NO"),
      v.literal("NO_TRADE"),
    ),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(),
    aggregatedReasoning: v.string(),
    priceAtTrigger: v.number(),
    // NEW: Structured output fields (optional for backwards compatibility)
    voteDistribution: v.optional(
      v.object({
        YES: v.number(),
        NO: v.number(),
        NO_TRADE: v.number(),
      }),
    ),
    averageConfidence: v.optional(v.number()),
    confidenceRange: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
      }),
    ),
    aggregatedKeyFactors: v.optional(v.array(v.string())),
    aggregatedRisks: v.optional(v.array(v.string())),
  },
  returns: v.id("signals"),
  handler: async (ctx, args): Promise<Id<"signals">> => {
    // Per design decision: 80%+ = high, 60-79% = medium, <60% = low
    const confidenceLevel =
      args.consensusPercentage >= 80
        ? ("high" as const)
        : args.consensusPercentage >= 60
          ? ("medium" as const)
          : ("low" as const);

    return await ctx.db.insert("signals", {
      marketId: args.marketId,
      triggerTrade: args.triggerTrade,
      consensusDecision: args.consensusDecision,
      consensusPercentage: args.consensusPercentage,
      totalModels: args.totalModels,
      agreeingModels: args.agreeingModels,
      aggregatedReasoning: args.aggregatedReasoning,
      confidenceLevel,
      isHighConfidence: args.consensusPercentage >= 80,
      priceAtTrigger: args.priceAtTrigger,
      signalTimestamp: Date.now(),
      // NEW: Structured output fields
      voteDistribution: args.voteDistribution,
      averageConfidence: args.averageConfidence,
      confidenceRange: args.confidenceRange,
      aggregatedKeyFactors: args.aggregatedKeyFactors,
      aggregatedRisks: args.aggregatedRisks,
      schemaVersion: args.voteDistribution ? "2.0.0" : undefined, // Mark as v2 if structured
    });
  },
});

export const aggregateTradeToSignal = internalMutation({
  args: {
    signalId: v.id("signals"),
    newTrade: tradeObjectValidator,
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const signal = await ctx.db.get(args.signalId);
    if (!signal) {
      throw new Error(`Signal ${args.signalId} not found`);
    }

    // Convert single trade to array if needed, then add new trade
    const existingTrades = Array.isArray(signal.triggerTrade)
      ? signal.triggerTrade
      : [signal.triggerTrade];

    await ctx.db.patch(args.signalId, {
      triggerTrade: [...existingTrades, args.newTrade],
    });

    return null;
  },
});

// ============ QUERIES ============

// Common signal object validator for query returns
const signalObjectValidator = v.object({
  _id: v.id("signals"),
  _creationTime: v.number(),
  marketId: v.id("markets"),
  triggerTrade: v.union(tradeObjectValidator, v.array(tradeObjectValidator)),
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
  isHighConfidence: v.boolean(),
  priceAtTrigger: v.number(),
  signalTimestamp: v.number(),
  // NEW: Structured output fields
  voteDistribution: v.optional(
    v.object({
      YES: v.number(),
      NO: v.number(),
      NO_TRADE: v.number(),
    }),
  ),
  averageConfidence: v.optional(v.number()),
  confidenceRange: v.optional(
    v.object({
      min: v.number(),
      max: v.number(),
    }),
  ),
  aggregatedKeyFactors: v.optional(v.array(v.string())),
  aggregatedRisks: v.optional(v.array(v.string())),
  schemaVersion: v.optional(v.string()),
});

const marketObjectValidator = v.object({
  _id: v.id("markets"),
  _creationTime: v.number(),
  polymarketId: v.string(),
  conditionId: v.optional(v.string()),
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
  outcome: v.optional(
    v.union(v.literal("YES"), v.literal("NO"), v.literal("INVALID"), v.null()),
  ),
  resolvedAt: v.optional(v.number()),
  resolutionSource: v.optional(v.string()),
});

export const getLatestSignals = query({
  args: {
    limit: v.optional(v.number()),
    onlyHighConfidence: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      ...signalObjectValidator.fields,
      market: v.union(marketObjectValidator, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let signals: Doc<"signals">[];

    if (args.onlyHighConfidence) {
      signals = await ctx.db
        .query("signals")
        .withIndex("by_high_confidence", (q) => q.eq("isHighConfidence", true))
        .order("desc")
        .take(limit);
    } else {
      signals = await ctx.db
        .query("signals")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);
    }

    return enrichSignalsWithMarkets(ctx, signals);
  },
});

export const getSignalsByMarket = query({
  args: {
    marketId: v.id("markets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("signals")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getSignalsWithPagination = query({
  args: {
    limit: v.optional(v.number()),
    onlyHighConfidence: v.optional(v.boolean()),
    decision: v.optional(
      v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
    ),
    cursor: v.optional(v.id("signals")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let baseQuery;

    if (args.onlyHighConfidence) {
      baseQuery = ctx.db
        .query("signals")
        .withIndex("by_high_confidence", (q) => q.eq("isHighConfidence", true))
        .order("desc");
    } else if (args.decision !== undefined) {
      const decision = args.decision;
      baseQuery = ctx.db
        .query("signals")
        .withIndex("by_decision", (q) => q.eq("consensusDecision", decision))
        .order("desc");
    } else {
      baseQuery = ctx.db.query("signals").withIndex("by_timestamp").order("desc");
    }

    const signals = await baseQuery.take(limit + 1);
    const hasMore = signals.length > limit;
    const items = hasMore ? signals.slice(0, -1) : signals;

    const lastItem = items[items.length - 1];
    return {
      items: await enrichSignalsWithMarkets(ctx, items),
      hasMore,
      nextCursor: hasMore && lastItem ? lastItem._id : undefined,
    };
  },
});

// ============ DEDUPLICATION ============

export const getRecentSignalForMarket = query({
  args: {
    marketId: v.id("markets"),
    withinMs: v.number(), // e.g., 60000 for 1 minute
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.withinMs;

    return await ctx.db
      .query("signals")
      .withIndex("by_market_time", (q) =>
        q.eq("marketId", args.marketId).gte("signalTimestamp", cutoff),
      )
      .order("desc")
      .first();
  },
});

// Internal version for use in actions/mutations
export const getRecentSignalForMarketInternal = query({
  args: {
    marketId: v.id("markets"),
    withinMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.withinMs;

    return await ctx.db
      .query("signals")
      .withIndex("by_market_time", (q) =>
        q.eq("marketId", args.marketId).gte("signalTimestamp", cutoff),
      )
      .order("desc")
      .first();
  },
});

// ============ STATS ============

export const getSignalStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all signals for counting (this is fine for smaller datasets)
    const allSignals = await ctx.db.query("signals").collect();

    const signalsLast24h = allSignals.filter(
      (s) => s.signalTimestamp >= oneDayAgo,
    ).length;

    const signalsLast7d = allSignals.filter(
      (s) => s.signalTimestamp >= sevenDaysAgo,
    ).length;

    const highConfidenceSignals = allSignals.filter(
      (s) => s.isHighConfidence,
    ).length;

    return {
      totalSignals: allSignals.length,
      signalsLast24h,
      signalsLast7d,
      highConfidenceSignals,
      highConfidencePercentage:
        allSignals.length > 0
          ? Math.round((highConfidenceSignals / allSignals.length) * 100)
          : 0,
    };
  },
});

// ============ SIGNAL DETAIL WITH PREDICTIONS ============

export const getSignalWithPredictions = query({
  args: { signalId: v.id("signals") },
  handler: async (ctx, args) => {
    const signal = await ctx.db.get(args.signalId);
    if (!signal) return null;

    const market = await ctx.db.get(signal.marketId);

    // Fetch linked model predictions created around the same time as the signal
    // Signals are created from AI swarm analysis, so predictions should be within a small window
    const predictionWindow = 60 * 1000; // 1 minute
    const predictions = await ctx.db
      .query("modelPredictions")
      .withIndex("by_market", (q) => q.eq("marketId", signal.marketId))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), signal.signalTimestamp - predictionWindow),
          q.lte(q.field("timestamp"), signal.signalTimestamp + predictionWindow),
        ),
      )
      .collect();

    // Get the first trade for detail display (handle union type)
    const firstTrade = Array.isArray(signal.triggerTrade)
      ? signal.triggerTrade[0]
      : signal.triggerTrade;

    return {
      ...signal,
      triggerTrade: firstTrade,
      market: market
        ? {
            _id: market._id,
            title: market.title,
            eventSlug: market.eventSlug,
            currentYesPrice: market.currentYesPrice,
            outcome: market.outcome,
          }
        : null,
      predictions,
    };
  },
});

// ============ SIGNALS SINCE TIMESTAMP (for notifications) ============

export const getSignalsSince = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("signals")
      .withIndex("by_timestamp")
      .filter((q) => q.gt(q.field("signalTimestamp"), args.since))
      .order("desc")
      .take(args.limit ?? 20);

    return Promise.all(
      signals.map(async (signal) => {
        const market = await ctx.db.get(signal.marketId);
        return {
          ...signal,
          market: market ? { _id: market._id, title: market.title } : null,
        };
      }),
    );
  },
});

// ============ HELPERS ============

async function enrichSignalsWithMarkets(
  ctx: QueryCtx,
  signals: Doc<"signals">[],
): Promise<(Doc<"signals"> & { market: Doc<"markets"> | null })[]> {
  return Promise.all(
    signals.map(async (signal) => {
      const market = await ctx.db.get(signal.marketId);
      return { ...signal, market };
    }),
  );
}
