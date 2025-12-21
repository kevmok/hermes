import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';

// ============ COLLECTOR MUTATIONS (called by lofn collector service) ============
// These are public mutations for the collector service to call via ConvexHttpClient.
// In production, consider adding authentication via Convex Auth or deploy keys.

// Analysis throttling: only trigger analysis once per hour per market
const ONE_HOUR_MS = 60 * 60 * 1000;

export const upsertMarket = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('markets')
      .withIndex('by_polymarket_id', (q) =>
        q.eq('polymarketId', args.polymarketId),
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
        lastTradeAt: now,
      });

      // Throttle analysis: only trigger if not analyzed in the last hour
      const shouldAnalyze =
        !existing.lastAnalyzedAt || now - existing.lastAnalyzedAt > ONE_HOUR_MS;

      if (shouldAnalyze) {
        await ctx.scheduler.runAfter(
          0,
          internal.analysis.analyzeMarketWithSwarm,
          { marketId: existing._id },
        );
      }

      return existing._id;
    }

    const marketId = await ctx.db.insert('markets', {
      ...args,
      createdAt: now,
      updatedAt: now,
      lastTradeAt: now,
    });

    // Always analyze new markets
    await ctx.scheduler.runAfter(0, internal.analysis.analyzeMarketWithSwarm, {
      marketId,
    });

    return marketId;
  },
});

export const upsertMarketsBatch = mutation({
  args: {
    markets: v.array(
      v.object({
        polymarketId: v.string(),
        conditionId: v.optional(v.string()),
        eventSlug: v.string(),
        title: v.string(),
        currentYesPrice: v.number(),
        currentNoPrice: v.number(),
        volume24h: v.number(),
        totalVolume: v.number(),
        isActive: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results = [];

    for (const market of args.markets) {
      const existing = await ctx.db
        .query('markets')
        .withIndex('by_polymarket_id', (q) =>
          q.eq('polymarketId', market.polymarketId),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...market,
          updatedAt: now,
          lastTradeAt: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert('markets', {
          ...market,
          createdAt: now,
          updatedAt: now,
          lastTradeAt: now,
        });
        results.push(id);
      }
    }

    return results;
  },
});

export const recordSnapshot = mutation({
  args: {
    marketId: v.id('markets'),
    yesPrice: v.number(),
    noPrice: v.number(),
    volume: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('marketSnapshots', {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const markMarketAnalyzed = mutation({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.marketId, {
      lastAnalyzedAt: Date.now(),
    });
  },
});

// ============ INTERNAL QUERIES ============

export const getMarketsNeedingAnalysis = query({
  args: {
    limit: v.number(),
    minHoursSinceLastAnalysis: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.minHoursSinceLastAnalysis * 60 * 60 * 1000;

    // Get active markets that haven't been analyzed recently
    const markets = await ctx.db
      .query('markets')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .filter((q) =>
        q.or(
          q.eq(q.field('lastAnalyzedAt'), undefined),
          q.lt(q.field('lastAnalyzedAt'), cutoff),
        ),
      )
      .take(args.limit * 2); // Get extra to sort

    // Sort by volume and return top N
    return markets
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, args.limit);
  },
});

export const getMarketById = internalQuery({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.marketId);
  },
});

// ============ PUBLIC QUERIES ============

export const listActiveMarkets = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal('volume'),
        v.literal('recent'),
        v.literal('ending_soon'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let markets;
    if (args.category) {
      markets = await ctx.db
        .query('markets')
        .withIndex('by_category', (q) => q.eq('category', args.category))
        .filter((q) => q.eq(q.field('isActive'), true))
        .take(limit * 2);
    } else {
      markets = await ctx.db
        .query('markets')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .take(limit * 2);
    }

    // Sort based on preference
    if (args.sortBy === 'volume') {
      markets.sort((a, b) => b.volume24h - a.volume24h);
    } else if (args.sortBy === 'recent') {
      markets.sort((a, b) => b.lastTradeAt - a.lastTradeAt);
    } else if (args.sortBy === 'ending_soon') {
      markets.sort(
        (a, b) =>
          (a.endDate ?? Number.POSITIVE_INFINITY) -
          (b.endDate ?? Number.POSITIVE_INFINITY),
      );
    }

    return markets.slice(0, limit);
  },
});

export const getMarket = query({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.marketId);
  },
});

export const getMarketByPolymarketId = query({
  args: { polymarketId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('markets')
      .withIndex('by_polymarket_id', (q) =>
        q.eq('polymarketId', args.polymarketId),
      )
      .first();
  },
});

export const getMarketSnapshots = query({
  args: {
    marketId: v.id('markets'),
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.since ?? Date.now() - 24 * 60 * 60 * 1000; // Default 24h

    return await ctx.db
      .query('marketSnapshots')
      .withIndex('by_market_time', (q) =>
        q.eq('marketId', args.marketId).gte('timestamp', since),
      )
      .take(args.limit ?? 500);
  },
});

export const searchMarkets = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const searchTerm = args.query.toLowerCase();

    // Simple search - for production, consider Convex search indexes
    const markets = await ctx.db
      .query('markets')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(1000);

    return markets
      .filter((m) => m.title.toLowerCase().includes(searchTerm))
      .slice(0, limit);
  },
});

// ============ PUBLIC MUTATIONS ============

export const deactivateMarket = mutation({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.marketId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});
