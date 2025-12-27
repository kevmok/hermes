import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listWatchlists = query({
  handler: async (ctx) => {
    const watchlists = await ctx.db.query('watchlists').collect();

    return Promise.all(
      watchlists.map(async (list) => {
        const items = await ctx.db
          .query('watchlistItems')
          .withIndex('by_watchlist', (q) => q.eq('watchlistId', list._id))
          .collect();
        return { ...list, itemCount: items.length };
      }),
    );
  },
});

export const getWatchlist = query({
  args: { watchlistId: v.id('watchlists') },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist) return null;

    const items = await ctx.db
      .query('watchlistItems')
      .withIndex('by_watchlist', (q) => q.eq('watchlistId', args.watchlistId))
      .collect();

    const marketsWithInsights = await Promise.all(
      items.map(async (item) => {
        const market = await ctx.db.get(item.marketId);
        const latestInsight = await ctx.db
          .query('insights')
          .withIndex('by_market', (q) => q.eq('marketId', item.marketId))
          .order('desc')
          .first();
        return { ...item, market, latestInsight };
      }),
    );

    return { ...watchlist, items: marketsWithInsights };
  },
});

export const getDefaultWatchlist = query({
  handler: async (ctx) => {
    const watchlist = await ctx.db
      .query('watchlists')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .first();

    if (!watchlist) {
      // No default watchlist exists
      return null;
    }

    const items = await ctx.db
      .query('watchlistItems')
      .withIndex('by_watchlist', (q) => q.eq('watchlistId', watchlist._id))
      .collect();

    const marketsWithInsights = await Promise.all(
      items.map(async (item) => {
        const market = await ctx.db.get(item.marketId);
        const latestInsight = await ctx.db
          .query('insights')
          .withIndex('by_market', (q) => q.eq('marketId', item.marketId))
          .order('desc')
          .first();
        return { ...item, market, latestInsight };
      }),
    );

    return { ...watchlist, items: marketsWithInsights };
  },
});

export const createWatchlist = mutation({
  args: {
    name: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // If this is being set as default, unset existing defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query('watchlists')
        .withIndex('by_default', (q) => q.eq('isDefault', true))
        .collect();

      for (const w of existingDefaults) {
        await ctx.db.patch(w._id, { isDefault: false });
      }
    }

    return await ctx.db.insert('watchlists', {
      name: args.name,
      isDefault: args.isDefault ?? false,
      createdAt: Date.now(),
    });
  },
});

export const addToWatchlist = mutation({
  args: {
    watchlistId: v.id('watchlists'),
    marketId: v.id('markets'),
  },
  handler: async (ctx, args) => {
    // Check if market exists
    const market = await ctx.db.get(args.marketId);
    if (!market) throw new ConvexError('Market not found');

    // Check if watchlist exists
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist) throw new ConvexError('Watchlist not found');

    // Check if already in watchlist
    const existing = await ctx.db
      .query('watchlistItems')
      .withIndex('by_watchlist_market', (q) =>
        q.eq('watchlistId', args.watchlistId).eq('marketId', args.marketId),
      )
      .first();

    if (existing) {
      throw new ConvexError('Market already in watchlist');
    }

    return await ctx.db.insert('watchlistItems', {
      watchlistId: args.watchlistId,
      marketId: args.marketId,
      addedAt: Date.now(),
    });
  },
});

export const removeFromWatchlist = mutation({
  args: {
    watchlistId: v.id('watchlists'),
    marketId: v.id('markets'),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db
      .query('watchlistItems')
      .withIndex('by_watchlist_market', (q) =>
        q.eq('watchlistId', args.watchlistId).eq('marketId', args.marketId),
      )
      .first();

    if (item) {
      await ctx.db.delete(item._id);
    }
  },
});

export const deleteWatchlist = mutation({
  args: { watchlistId: v.id('watchlists') },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist) throw new ConvexError('Watchlist not found');

    if (watchlist.isDefault) {
      throw new ConvexError('Cannot delete default watchlist');
    }

    // Delete all items
    const items = await ctx.db
      .query('watchlistItems')
      .withIndex('by_watchlist', (q) => q.eq('watchlistId', args.watchlistId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.watchlistId);
  },
});

export const renameWatchlist = mutation({
  args: {
    watchlistId: v.id('watchlists'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist) throw new ConvexError('Watchlist not found');

    await ctx.db.patch(args.watchlistId, { name: args.name });
  },
});

export const setDefaultWatchlist = mutation({
  args: { watchlistId: v.id('watchlists') },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist) throw new ConvexError('Watchlist not found');

    // Unset existing defaults
    const existingDefaults = await ctx.db
      .query('watchlists')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .collect();

    for (const w of existingDefaults) {
      await ctx.db.patch(w._id, { isDefault: false });
    }

    // Set new default
    await ctx.db.patch(args.watchlistId, { isDefault: true });
  },
});
