/**
 * Trade storage mutations
 *
 * Stores raw trade data from WebSocket feed.
 * Only essential fields are stored - market details fetched on-demand via API.
 */
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

// Input type for creating a trade
const TradeInput = {
  conditionId: v.string(),
  slug: v.string(),
  eventSlug: v.string(),
  side: v.union(v.literal('BUY'), v.literal('SELL')),
  size: v.number(),
  price: v.number(),
  timestamp: v.number(),
  proxyWallet: v.string(),
  outcome: v.string(),
  outcomeIndex: v.number(),
  transactionHash: v.optional(v.string()),
  isWhale: v.boolean(),
  traderName: v.optional(v.string()),
  traderPseudonym: v.optional(v.string()),
};

// ============ INTERNAL MUTATIONS ============

export const insertTrade = internalMutation({
  args: TradeInput,
  returns: v.id('trades'),
  handler: async (ctx, args): Promise<Id<'trades'>> => {
    return ctx.db.insert('trades', args);
  },
});

export const insertTradeWithSignal = internalMutation({
  args: {
    ...TradeInput,
    signalId: v.id('signals'),
  },
  returns: v.id('trades'),
  handler: async (ctx, args): Promise<Id<'trades'>> => {
    return ctx.db.insert('trades', args);
  },
});

export const linkTradeToSignal = internalMutation({
  args: {
    tradeId: v.id('trades'),
    signalId: v.id('signals'),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.patch(args.tradeId, { signalId: args.signalId });
    return null;
  },
});

// ============ PUBLIC MUTATIONS ============

export const recordTrade = mutation({
  args: TradeInput,
  returns: v.id('trades'),
  handler: async (ctx, args): Promise<Id<'trades'>> => {
    return ctx.db.insert('trades', args);
  },
});

// ============ INTERNAL QUERIES ============

export const getRecentTradesByCondition = internalQuery({
  args: {
    conditionId: v.string(),
    limit: v.optional(v.number()),
    sinceTimestamp: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const sinceTs = args.sinceTimestamp;

    if (sinceTs !== undefined) {
      const trades = await ctx.db
        .query('trades')
        .withIndex('by_condition_time', (q) =>
          q.eq('conditionId', args.conditionId).gt('timestamp', sinceTs),
        )
        .order('desc')
        .take(args.limit ?? 50);
      return trades;
    }

    const trades = await ctx.db
      .query('trades')
      .withIndex('by_condition_time', (q) =>
        q.eq('conditionId', args.conditionId),
      )
      .order('desc')
      .take(args.limit ?? 50);
    return trades;
  },
});

export const getWhaleTradesSince = internalQuery({
  args: {
    sinceTimestamp: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_whale', (q) =>
        q.eq('isWhale', true).gt('timestamp', args.sinceTimestamp),
      )
      .order('desc')
      .take(args.limit ?? 100);
    return trades;
  },
});

// ============ PUBLIC QUERIES ============

export const listTrades = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    trades: v.array(v.any()),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return { trades, nextCursor: null };
  },
});

export const listWhaleTrades = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    trades: v.array(v.any()),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_whale", (q) => q.eq("isWhale", true))
      .order("desc")
      .take(limit);

    return { trades, nextCursor: null };
  },
});

export const getTradesByMarket = query({
  args: {
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .order('desc')
      .take(args.limit ?? 50);
    return trades;
  },
});

export const getTradesByWallet = query({
  args: {
    proxyWallet: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_wallet', (q) => q.eq('proxyWallet', args.proxyWallet))
      .order('desc')
      .take(args.limit ?? 50);
    return trades;
  },
});

export const getTradesBySignal = query({
  args: {
    signalId: v.id('signals'),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_signal', (q) => q.eq('signalId', args.signalId))
      .collect();
    return trades;
  },
});

// ============ ANALYTICS ============

export const getTradeStats = query({
  args: {
    sinceTimestamp: v.optional(v.number()),
  },
  returns: v.object({
    totalTrades: v.number(),
    totalVolume: v.number(),
    whaleTrades: v.number(),
    whaleVolume: v.number(),
  }),
  handler: async (ctx, args) => {
    const since = args.sinceTimestamp ?? Date.now() / 1000 - 24 * 60 * 60;
    const trades = await ctx.db
      .query("trades")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", since))
      .collect();

    let totalVolume = 0;
    let whaleTrades = 0;
    let whaleVolume = 0;

    for (const trade of trades) {
      totalVolume += trade.size;
      if (trade.isWhale) {
        whaleTrades++;
        whaleVolume += trade.size;
      }
    }

    return { totalTrades: trades.length, totalVolume, whaleTrades, whaleVolume };
  },
});
