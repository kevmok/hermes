import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  internalQuery,
  query,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const PRICE_MOVEMENT_THRESHOLD = 0.1;
const PRICE_MOVEMENT_WINDOW_MS = 4 * 60 * 60 * 1000;
const CONTRARIAN_MIN_WIN_RATE = 0.55;
const RESOLUTION_PROXIMITY_DAYS = 7;
const TRIGGER_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const recordPriceSnapshot = internalMutation({
  args: {
    marketId: v.id("markets"),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("priceSnapshots", {
      marketId: args.marketId,
      price: args.price,
      timestamp: Date.now(),
    });
  },
});

export const getRecentPriceSnapshots = internalQuery({
  args: {
    marketId: v.id("markets"),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - args.sinceMs;
    return await ctx.db
      .query("priceSnapshots")
      .withIndex("by_market_time", (q) =>
        q.eq("marketId", args.marketId).gte("timestamp", since),
      )
      .collect();
  },
});

export const detectPriceMovement = internalMutation({
  args: {
    marketId: v.id("markets"),
    currentPrice: v.number(),
  },
  returns: v.object({
    detected: v.boolean(),
    triggerId: v.optional(v.id("smartTriggers")),
    direction: v.optional(v.union(v.literal("up"), v.literal("down"))),
    magnitude: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    detected: boolean;
    triggerId?: Id<"smartTriggers">;
    direction?: "up" | "down";
    magnitude?: number;
  }> => {
    const windowStart = Date.now() - PRICE_MOVEMENT_WINDOW_MS;

    const snapshots = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_market_time", (q) =>
        q.eq("marketId", args.marketId).gte("timestamp", windowStart),
      )
      .collect();

    if (snapshots.length === 0) {
      return { detected: false };
    }

    const oldestSnapshot = snapshots.reduce((oldest, s) =>
      s.timestamp < oldest.timestamp ? s : oldest,
    );

    const priceChange = args.currentPrice - oldestSnapshot.price;
    const magnitude = Math.abs(priceChange);

    if (magnitude < PRICE_MOVEMENT_THRESHOLD) {
      return { detected: false };
    }

    const existingTrigger = await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("triggerType"), "price_movement"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingTrigger) {
      return { detected: false };
    }

    const direction = priceChange > 0 ? ("up" as const) : ("down" as const);
    const score = magnitude * 100;

    const triggerId = await ctx.db.insert("smartTriggers", {
      marketId: args.marketId,
      triggerType: "price_movement",
      status: "active",
      priceMovement: {
        direction,
        magnitude,
        timeWindowMs: PRICE_MOVEMENT_WINDOW_MS,
        startPrice: oldestSnapshot.price,
        currentPrice: args.currentPrice,
        startedAt: oldestSnapshot.timestamp,
      },
      score,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRIGGER_EXPIRY_MS,
    });

    return { detected: true, triggerId, direction, magnitude };
  },
});

export const detectContrarianWhale = internalMutation({
  args: {
    marketId: v.id("markets"),
    whaleAddress: v.string(),
    whaleSide: v.union(v.literal("YES"), v.literal("NO")),
    tradeSize: v.number(),
  },
  returns: v.object({
    detected: v.boolean(),
    triggerId: v.optional(v.id("smartTriggers")),
    isContrarian: v.optional(v.boolean()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    detected: boolean;
    triggerId?: Id<"smartTriggers">;
    isContrarian?: boolean;
  }> => {
    const recentSignal = await ctx.db
      .query("signals")
      .withIndex("by_market_time", (q) =>
        q
          .eq("marketId", args.marketId)
          .gte("signalTimestamp", Date.now() - 24 * 60 * 60 * 1000),
      )
      .order("desc")
      .first();

    if (!recentSignal || recentSignal.consensusDecision === "NO_TRADE") {
      return { detected: false };
    }

    const consensusSide = recentSignal.consensusDecision;
    const isContrarian = args.whaleSide !== consensusSide;

    if (!isContrarian) {
      return { detected: false, isContrarian: false };
    }

    const whaleProfile = await ctx.db
      .query("whaleProfiles")
      .withIndex("by_address", (q) => q.eq("address", args.whaleAddress))
      .first();

    const whaleWinRate = whaleProfile?.winRate;
    const isSmartMoney =
      whaleProfile?.isSmartMoney ||
      (whaleWinRate && whaleWinRate >= CONTRARIAN_MIN_WIN_RATE);

    const existingTrigger = await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("triggerType"), "contrarian_whale"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingTrigger) {
      return { detected: false, isContrarian: true };
    }

    let score = 50;
    if (isSmartMoney) score += 30;
    if (whaleWinRate && whaleWinRate > 0.6) score += 20;
    score += Math.min(args.tradeSize / 10000, 20);

    const triggerId = await ctx.db.insert("smartTriggers", {
      marketId: args.marketId,
      triggerType: "contrarian_whale",
      status: "active",
      contrarianWhale: {
        whaleAddress: args.whaleAddress,
        whaleSide: args.whaleSide,
        consensusSide,
        tradeSize: args.tradeSize,
        whaleWinRate,
      },
      score,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRIGGER_EXPIRY_MS,
    });

    return { detected: true, triggerId, isContrarian: true };
  },
});

export const calculateResolutionProximity = internalMutation({
  args: {
    marketId: v.id("markets"),
    currentPrice: v.number(),
    estimatedResolutionAt: v.optional(v.number()),
  },
  returns: v.object({
    detected: v.boolean(),
    triggerId: v.optional(v.id("smartTriggers")),
    score: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    detected: boolean;
    triggerId?: Id<"smartTriggers">;
    score?: number;
  }> => {
    let priceExtremeLevel: "very_high" | "high" | "medium" | "low";

    const priceExtreme = Math.max(args.currentPrice, 1 - args.currentPrice);

    if (priceExtreme >= 0.9) {
      priceExtremeLevel = "very_high";
    } else if (priceExtreme >= 0.8) {
      priceExtremeLevel = "high";
    } else if (priceExtreme >= 0.7) {
      priceExtremeLevel = "medium";
    } else {
      priceExtremeLevel = "low";
    }

    let daysUntilResolution: number | undefined;
    if (args.estimatedResolutionAt) {
      daysUntilResolution = Math.max(
        0,
        (args.estimatedResolutionAt - Date.now()) / (24 * 60 * 60 * 1000),
      );
    }

    const isNearResolution =
      daysUntilResolution !== undefined &&
      daysUntilResolution <= RESOLUTION_PROXIMITY_DAYS;
    const isPriceExtreme =
      priceExtremeLevel === "very_high" || priceExtremeLevel === "high";

    if (!isNearResolution && !isPriceExtreme) {
      return { detected: false };
    }

    const existingTrigger = await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("triggerType"), "resolution_proximity"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingTrigger) {
      return { detected: false };
    }

    let score = 0;

    if (priceExtremeLevel === "very_high") score += 40;
    else if (priceExtremeLevel === "high") score += 25;
    else if (priceExtremeLevel === "medium") score += 10;

    if (daysUntilResolution !== undefined) {
      if (daysUntilResolution <= 1) score += 40;
      else if (daysUntilResolution <= 3) score += 30;
      else if (daysUntilResolution <= 7) score += 20;
    }

    const triggerId = await ctx.db.insert("smartTriggers", {
      marketId: args.marketId,
      triggerType: "resolution_proximity",
      status: "active",
      resolutionProximity: {
        estimatedResolutionAt: args.estimatedResolutionAt,
        daysUntilResolution,
        currentPrice: args.currentPrice,
        priceExtremeLevel,
      },
      score,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRIGGER_EXPIRY_MS * 3,
    });

    return { detected: true, triggerId, score };
  },
});

export const getActiveTriggersForMarket = query({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getTopTriggers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const triggers = await ctx.db
      .query("smartTriggers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const sortedTriggers = triggers.sort((a, b) => b.score - a.score);

    const limitedTriggers = sortedTriggers.slice(0, args.limit ?? 20);

    const results = await Promise.all(
      limitedTriggers.map(async (trigger) => {
        const market = await ctx.db.get(trigger.marketId);
        return { ...trigger, market };
      }),
    );

    return results;
  },
});

export const expireOldTriggers = internalMutation({
  args: {},
  returns: v.object({ expired: v.number() }),
  handler: async (ctx): Promise<{ expired: number }> => {
    const now = Date.now();

    const expiredTriggers = await ctx.db
      .query("smartTriggers")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const trigger of expiredTriggers) {
      await ctx.db.patch(trigger._id, { status: "expired" });
    }

    return { expired: expiredTriggers.length };
  },
});

export const markTriggerTriggered = internalMutation({
  args: { triggerId: v.id("smartTriggers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.triggerId, {
      status: "triggered",
      triggeredAt: Date.now(),
    });
  },
});

export const cleanupOldSnapshots = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx): Promise<{ deleted: number }> => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const oldSnapshots = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoff))
      .take(1000);

    for (const snapshot of oldSnapshots) {
      await ctx.db.delete(snapshot._id);
    }

    return { deleted: oldSnapshots.length };
  },
});

export const evaluateMarketTriggers = internalAction({
  args: {
    marketId: v.id("markets"),
    currentPrice: v.number(),
    estimatedResolutionAt: v.optional(v.number()),
  },
  returns: v.object({
    priceMovement: v.boolean(),
    resolutionProximity: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    priceMovement: boolean;
    resolutionProximity: boolean;
  }> => {
    await ctx.runMutation(internal.smartTriggers.recordPriceSnapshot, {
      marketId: args.marketId,
      price: args.currentPrice,
    });

    const priceResult = await ctx.runMutation(
      internal.smartTriggers.detectPriceMovement,
      {
        marketId: args.marketId,
        currentPrice: args.currentPrice,
      },
    );

    const resolutionResult = await ctx.runMutation(
      internal.smartTriggers.calculateResolutionProximity,
      {
        marketId: args.marketId,
        currentPrice: args.currentPrice,
        estimatedResolutionAt: args.estimatedResolutionAt,
      },
    );

    return {
      priceMovement: priceResult.detected,
      resolutionProximity: resolutionResult.detected,
    };
  },
});

export const trackTradePrice = mutation({
  args: {
    marketId: v.id("markets"),
    price: v.number(),
  },
  returns: v.object({
    snapshotRecorded: v.boolean(),
    priceMovementDetected: v.boolean(),
    triggerId: v.optional(v.id("smartTriggers")),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    snapshotRecorded: boolean;
    priceMovementDetected: boolean;
    triggerId?: Id<"smartTriggers">;
  }> => {
    await ctx.db.insert("priceSnapshots", {
      marketId: args.marketId,
      price: args.price,
      timestamp: Date.now(),
    });

    const windowStart = Date.now() - PRICE_MOVEMENT_WINDOW_MS;
    const snapshots = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_market_time", (q) =>
        q.eq("marketId", args.marketId).gte("timestamp", windowStart),
      )
      .collect();

    if (snapshots.length < 2) {
      return { snapshotRecorded: true, priceMovementDetected: false };
    }

    const oldestSnapshot = snapshots.reduce((oldest, s) =>
      s.timestamp < oldest.timestamp ? s : oldest,
    );

    const priceChange = args.price - oldestSnapshot.price;
    const magnitude = Math.abs(priceChange);

    if (magnitude < PRICE_MOVEMENT_THRESHOLD) {
      return { snapshotRecorded: true, priceMovementDetected: false };
    }

    const existingTrigger = await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("triggerType"), "price_movement"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingTrigger) {
      return { snapshotRecorded: true, priceMovementDetected: false };
    }

    const direction = priceChange > 0 ? ("up" as const) : ("down" as const);
    const score = magnitude * 100;

    const triggerId = await ctx.db.insert("smartTriggers", {
      marketId: args.marketId,
      triggerType: "price_movement",
      status: "active",
      priceMovement: {
        direction,
        magnitude,
        timeWindowMs: PRICE_MOVEMENT_WINDOW_MS,
        startPrice: oldestSnapshot.price,
        currentPrice: args.price,
        startedAt: oldestSnapshot.timestamp,
      },
      score,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRIGGER_EXPIRY_MS,
    });

    console.log(
      `[TRIGGER] Price movement detected: ${direction} ${(magnitude * 100).toFixed(1)}%`,
    );

    return { snapshotRecorded: true, priceMovementDetected: true, triggerId };
  },
});

export const checkContrarianWhale = mutation({
  args: {
    marketId: v.id("markets"),
    whaleAddress: v.string(),
    whaleSide: v.union(v.literal("YES"), v.literal("NO")),
    tradeSize: v.number(),
  },
  returns: v.object({
    isContrarian: v.boolean(),
    triggerId: v.optional(v.id("smartTriggers")),
    score: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    isContrarian: boolean;
    triggerId?: Id<"smartTriggers">;
    score?: number;
  }> => {
    const recentSignal = await ctx.db
      .query("signals")
      .withIndex("by_market_time", (q) =>
        q
          .eq("marketId", args.marketId)
          .gte("signalTimestamp", Date.now() - 24 * 60 * 60 * 1000),
      )
      .order("desc")
      .first();

    if (!recentSignal || recentSignal.consensusDecision === "NO_TRADE") {
      return { isContrarian: false };
    }

    const consensusSide = recentSignal.consensusDecision;
    const isContrarian = args.whaleSide !== consensusSide;

    if (!isContrarian) {
      return { isContrarian: false };
    }

    const existingTrigger = await ctx.db
      .query("smartTriggers")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.and(
          q.eq(q.field("triggerType"), "contrarian_whale"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingTrigger) {
      return { isContrarian: true };
    }

    const whaleProfile = await ctx.db
      .query("whaleProfiles")
      .withIndex("by_address", (q) => q.eq("address", args.whaleAddress))
      .first();

    const whaleWinRate = whaleProfile?.winRate;
    const isSmartMoney =
      whaleProfile?.isSmartMoney ||
      (whaleWinRate && whaleWinRate >= CONTRARIAN_MIN_WIN_RATE);

    let score = 50;
    if (isSmartMoney) score += 30;
    if (whaleWinRate && whaleWinRate > 0.6) score += 20;
    score += Math.min(args.tradeSize / 10000, 20);

    const triggerId = await ctx.db.insert("smartTriggers", {
      marketId: args.marketId,
      triggerType: "contrarian_whale",
      status: "active",
      contrarianWhale: {
        whaleAddress: args.whaleAddress,
        whaleSide: args.whaleSide,
        consensusSide,
        tradeSize: args.tradeSize,
        whaleWinRate,
      },
      score,
      createdAt: Date.now(),
      expiresAt: Date.now() + TRIGGER_EXPIRY_MS,
    });

    console.log(
      `[TRIGGER] Contrarian whale: ${args.whaleSide} vs consensus ${consensusSide} (score: ${score})`,
    );

    return { isContrarian: true, triggerId, score };
  },
});
