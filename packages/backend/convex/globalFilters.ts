import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';

// Default filter values per design decisions document
const DEFAULT_FILTERS = {
  minTradeSize: 500, // $500 minimum trade size
  maxPriceYes: 0.98, // Exclude near-certain YES outcomes
  minPriceYes: 0.02, // Exclude near-certain NO outcomes
  minVolume24h: 10000, // $10k minimum 24h volume
  excludedCategories: [] as string[],
  deduplicationWindowMs: 60000, // 1 minute dedup window
  minConsensusPercentage: 60, // 60% minimum consensus to create signal
  isEnabled: true,
};

// ============ QUERIES ============

export const getFilters = query({
  args: {},
  handler: async (ctx) => {
    const filters = await ctx.db.query('globalFilters').first();
    if (!filters) {
      return { ...DEFAULT_FILTERS, _id: null as null };
    }
    return filters;
  },
});

export const getFiltersInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const filters = await ctx.db.query('globalFilters').first();
    if (!filters) {
      return DEFAULT_FILTERS;
    }
    return {
      minTradeSize: filters.minTradeSize,
      maxPriceYes: filters.maxPriceYes,
      minPriceYes: filters.minPriceYes,
      minVolume24h: filters.minVolume24h,
      excludedCategories: filters.excludedCategories,
      deduplicationWindowMs: filters.deduplicationWindowMs,
      minConsensusPercentage: filters.minConsensusPercentage,
      isEnabled: filters.isEnabled,
    };
  },
});

// ============ MUTATIONS ============

export const updateFilters = mutation({
  args: {
    minTradeSize: v.optional(v.number()),
    maxPriceYes: v.optional(v.number()),
    minPriceYes: v.optional(v.number()),
    minVolume24h: v.optional(v.number()),
    excludedCategories: v.optional(v.array(v.string())),
    deduplicationWindowMs: v.optional(v.number()),
    minConsensusPercentage: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('globalFilters').first();

    // Build updates object, filtering out undefined values
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.minTradeSize !== undefined)
      updates.minTradeSize = args.minTradeSize;
    if (args.maxPriceYes !== undefined) updates.maxPriceYes = args.maxPriceYes;
    if (args.minPriceYes !== undefined) updates.minPriceYes = args.minPriceYes;
    if (args.minVolume24h !== undefined)
      updates.minVolume24h = args.minVolume24h;
    if (args.excludedCategories !== undefined)
      updates.excludedCategories = args.excludedCategories;
    if (args.deduplicationWindowMs !== undefined)
      updates.deduplicationWindowMs = args.deduplicationWindowMs;
    if (args.minConsensusPercentage !== undefined)
      updates.minConsensusPercentage = args.minConsensusPercentage;
    if (args.isEnabled !== undefined) updates.isEnabled = args.isEnabled;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create singleton document with defaults + updates
    return await ctx.db.insert('globalFilters', {
      ...DEFAULT_FILTERS,
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const initializeFilters = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('globalFilters').first();
    if (existing) return existing._id;

    return await ctx.db.insert('globalFilters', {
      ...DEFAULT_FILTERS,
      updatedAt: Date.now(),
    });
  },
});

export const toggleEnabled = mutation({
  args: {
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('globalFilters').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create with defaults if doesn't exist
    return await ctx.db.insert('globalFilters', {
      ...DEFAULT_FILTERS,
      isEnabled: args.isEnabled,
      updatedAt: Date.now(),
    });
  },
});
