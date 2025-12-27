import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { internal } from './_generated/api';

// ============ COLLECTOR MUTATIONS (called by lofn collector service) ============
// These are public mutations for the collector service to call via ConvexHttpClient.
// In production, consider adding authentication via Convex Auth or deploy keys.

// Trade context validator for signal creation
const tradeContextValidator = v.object({
  size: v.number(),
  price: v.number(),
  side: v.union(v.literal('YES'), v.literal('NO')),
  taker: v.optional(v.string()),
  timestamp: v.number(),
});

export const upsertMarket = mutation({
  args: {
    polymarketId: v.string(),
    conditionId: v.optional(v.string()),
    slug: v.string(),
    eventSlug: v.string(),
    title: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
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
      return existing._id;
    }

    const marketId = await ctx.db.insert('markets', {
      ...args,
      createdAt: now,
      updatedAt: now,
      lastTradeAt: now,
    });

    return marketId;
  },
});

// Upsert market with trade context for signal generation
// This is the preferred method for whale trade processing
export const upsertMarketWithTrade = mutation({
  args: {
    polymarketId: v.string(),
    conditionId: v.optional(v.string()),
    slug: v.string(),
    eventSlug: v.string(),
    title: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    // Trade context for signal creation
    tradeContext: tradeContextValidator,
  },
  handler: async (ctx, args) => {
    const { tradeContext, ...marketArgs } = args;

    const existing = await ctx.db
      .query('markets')
      .withIndex('by_polymarket_id', (q) =>
        q.eq('polymarketId', args.polymarketId),
      )
      .first();

    const now = Date.now();

    let marketId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...marketArgs,
        updatedAt: now,
        lastTradeAt: now,
      });
      marketId = existing._id;
    } else {
      marketId = await ctx.db.insert('markets', {
        ...marketArgs,
        createdAt: now,
        updatedAt: now,
        lastTradeAt: now,
      });
    }

    // Always trigger signal analysis for qualifying trades
    // The action will handle deduplication and consensus thresholds
    try {
      await ctx.scheduler.runAfter(0, internal.analysis.analyzeTradeForSignal, {
        marketId,
        tradeContext,
      });
    } catch (error) {
      // Log but don't fail - market upsert succeeded
      console.error('Failed to schedule signal analysis:', { marketId, error });
    }

    return marketId;
  },
});

export const upsertMarketsBatch = mutation({
  args: {
    markets: v.array(
      v.object({
        polymarketId: v.string(),
        conditionId: v.optional(v.string()),
        slug: v.string(),
        eventSlug: v.string(),
        title: v.string(),
        imageUrl: v.optional(v.string()),
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

export const getMarketById = internalQuery({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.marketId);
  },
});

export const getUnresolvedMarkets = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query('markets')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .filter((q) => q.eq(q.field('outcome'), undefined))
      .take(args.limit ?? 100);
  },
});

// ============ PUBLIC QUERIES ============

export const listActiveMarkets = query({
  args: {
    limit: v.optional(v.number()),
    eventSlug: v.optional(v.string()),
    sortBy: v.optional(
      v.union(v.literal('recent'), v.literal('analyzed'), v.literal('volume')),
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    let markets;
    const eventSlug = args.eventSlug;
    if (eventSlug) {
      markets = await ctx.db
        .query('markets')
        .withIndex('by_event_slug', (q) => q.eq('eventSlug', eventSlug))
        .filter((q) => q.eq(q.field('isActive'), true))
        .take(limit * 2);
    } else {
      markets = await ctx.db
        .query('markets')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .take(limit * 2);
    }

    // Sort based on preference
    if (args.sortBy === 'analyzed') {
      markets.sort((a, b) => (b.lastAnalyzedAt ?? 0) - (a.lastAnalyzedAt ?? 0));
    } else {
      // Default: recent (by lastTradeAt) - also used for 'volume' since markets don't store volume
      markets.sort((a, b) => b.lastTradeAt - a.lastTradeAt);
    }

    return markets.slice(0, limit);
  },
});

export const getMarket = query({
  args: { marketId: v.union(v.id('markets'), v.null()) },
  handler: async (ctx, args) => {
    if (!args.marketId) return null;
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

// ============ OUTCOME TRACKING ============

export const updateMarketOutcome = internalMutation({
  args: {
    marketId: v.id('markets'),
    outcome: v.union(
      v.literal('YES'),
      v.literal('NO'),
      v.literal('INVALID'),
      v.null(),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.marketId, {
      outcome: args.outcome,
      resolvedAt: Date.now(),
      isActive: false,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getResolvedMarkets = query({
  args: {
    limit: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const markets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) =>
        q.and(
          q.neq(q.field('outcome'), undefined),
          args.since ? q.gte(q.field('resolvedAt'), args.since) : true,
        ),
      )
      .order('desc')
      .take(limit);

    return markets;
  },
});

export const getUnresolvedMarketsWithSignals = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get active markets that have signals but no outcome yet
    const activeMarkets = await ctx.db
      .query('markets')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .filter((q) => q.eq(q.field('outcome'), undefined))
      .take(args.limit ?? 100);

    // Check signals in parallel (avoid N+1)
    const marketsWithSignalStatus = await Promise.all(
      activeMarkets.map(async (market) => {
        const hasSignal = await ctx.db
          .query('signals')
          .withIndex('by_market', (q) => q.eq('marketId', market._id))
          .first();
        return { market, hasSignal: !!hasSignal };
      }),
    );

    return marketsWithSignalStatus
      .filter(({ hasSignal }) => hasSignal)
      .map(({ market }) => market);
  },
});
