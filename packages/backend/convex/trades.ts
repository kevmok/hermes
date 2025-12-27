/**
 * Trade storage mutations
 *
 * Stores raw trade data from WebSocket feed.
 * Only essential fields are stored - market details fetched on-demand via API.
 * Also updates the events table to track which events we're monitoring.
 */
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
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
  // Title from WebSocket payload - used to create/update event
  title: v.optional(v.string()),
};

// Helper to derive event title from slug if not provided
function deriveEventTitle(slug: string, eventSlug: string): string {
  // Use eventSlug as base, convert kebab-case to Title Case
  const base = eventSlug || slug;
  return base
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============ INTERNAL MUTATIONS ============

export const insertTrade = internalMutation({
  args: TradeInput,
  returns: v.id('trades'),
  handler: async (ctx, args): Promise<Id<'trades'>> => {
    // Insert the trade with title for display
    const title = args.title || deriveEventTitle(args.slug, args.eventSlug);
    const tradeId = await ctx.db.insert('trades', {
      conditionId: args.conditionId,
      slug: args.slug,
      eventSlug: args.eventSlug,
      title,
      side: args.side,
      size: args.size,
      price: args.price,
      timestamp: args.timestamp,
      proxyWallet: args.proxyWallet,
      outcome: args.outcome,
      outcomeIndex: args.outcomeIndex,
      transactionHash: args.transactionHash,
      isWhale: args.isWhale,
      traderName: args.traderName,
      traderPseudonym: args.traderPseudonym,
    });

    // Upsert event to track this eventSlug
    await ctx.scheduler.runAfter(0, internal.events.upsertEvent, {
      eventSlug: args.eventSlug,
      title,
      tradeSize: args.size,
      tradeTimestamp: args.timestamp,
    });

    return tradeId;
  },
});

export const insertTradeWithSignal = internalMutation({
  args: {
    ...TradeInput,
    signalId: v.id('signals'),
  },
  returns: v.id('trades'),
  handler: async (ctx, args): Promise<Id<'trades'>> => {
    // Insert the trade with title for display and signal reference
    const title = args.title || deriveEventTitle(args.slug, args.eventSlug);
    const tradeId = await ctx.db.insert('trades', {
      conditionId: args.conditionId,
      slug: args.slug,
      eventSlug: args.eventSlug,
      title,
      side: args.side,
      size: args.size,
      price: args.price,
      timestamp: args.timestamp,
      proxyWallet: args.proxyWallet,
      outcome: args.outcome,
      outcomeIndex: args.outcomeIndex,
      transactionHash: args.transactionHash,
      isWhale: args.isWhale,
      traderName: args.traderName,
      traderPseudonym: args.traderPseudonym,
      signalId: args.signalId,
    });

    // Upsert event to track this eventSlug
    await ctx.scheduler.runAfter(0, internal.events.upsertEvent, {
      eventSlug: args.eventSlug,
      title,
      tradeSize: args.size,
      tradeTimestamp: args.timestamp,
    });

    return tradeId;
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
    // Insert the trade with title for display
    const title = args.title || deriveEventTitle(args.slug, args.eventSlug);
    const tradeId = await ctx.db.insert('trades', {
      conditionId: args.conditionId,
      slug: args.slug,
      eventSlug: args.eventSlug,
      title, // Include title for display in UI
      side: args.side,
      size: args.size,
      price: args.price,
      timestamp: args.timestamp,
      proxyWallet: args.proxyWallet,
      outcome: args.outcome,
      outcomeIndex: args.outcomeIndex,
      transactionHash: args.transactionHash,
      isWhale: args.isWhale,
      traderName: args.traderName,
      traderPseudonym: args.traderPseudonym,
    });

    // Upsert event to track this eventSlug
    await ctx.scheduler.runAfter(0, internal.events.upsertEvent, {
      eventSlug: args.eventSlug,
      title: title || deriveEventTitle(args.slug, args.eventSlug),
      tradeSize: args.size,
      tradeTimestamp: args.timestamp,
    });

    return tradeId;
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
      .query('trades')
      .withIndex('by_timestamp')
      .order('desc')
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
      .query('trades')
      .withIndex('by_whale', (q) => q.eq('isWhale', true))
      .order('desc')
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

export const getTradesByEvent = query({
  args: {
    eventSlug: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const trades = await ctx.db
      .query('trades')
      .withIndex('by_event_slug', (q) => q.eq('eventSlug', args.eventSlug))
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
      .query('trades')
      .withIndex('by_timestamp', (q) => q.gt('timestamp', since))
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

    return {
      totalTrades: trades.length,
      totalVolume,
      whaleTrades,
      whaleVolume,
    };
  },
});
