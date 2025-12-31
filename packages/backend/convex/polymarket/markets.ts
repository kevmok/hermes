/**
 * Convex actions for Polymarket Markets API
 *
 * Internal actions fetch from the API directly.
 * Public actions use ActionCache for TTL-based caching.
 */
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api as polymarketApi } from "./client";
import { marketBySlugCache, marketByIdCache } from "./cache";

// ============ INTERNAL ACTIONS (used by cache) ============

export const fetchMarketBySlug = internalAction({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getMarketBySlug(args.slug);
  },
});

export const fetchMarketById = internalAction({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getMarketById(args.id);
  },
});

// ============ PUBLIC ACTIONS (cached) ============

export const getMarketBySlug = action({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      return await marketBySlugCache.fetch(ctx, { slug: args.slug });
    } catch (error) {
      console.error("Polymarket getMarketBySlug error:", error);
      return null;
    }
  },
});

export const getMarketById = action({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    try {
      return await marketByIdCache.fetch(ctx, { id: args.id });
    } catch (error) {
      console.error("Polymarket getMarketById error:", error);
      return null;
    }
  },
});

// List markets - not cached (always fresh for browsing)
export const listMarkets = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    active: v.optional(v.boolean()),
    closed: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    try {
      return await polymarketApi.listMarkets({
        limit: args.limit,
        offset: args.offset,
        active: args.active,
        closed: args.closed,
      });
    } catch (error) {
      console.error("Polymarket listMarkets error:", error);
      return [];
    }
  },
});

// ============ CACHE MANAGEMENT ============

export const invalidateMarketBySlug = action({
  args: { slug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await marketBySlugCache.remove(ctx, { slug: args.slug });
    return null;
  },
});

export const invalidateMarketById = action({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await marketByIdCache.remove(ctx, { id: args.id });
    return null;
  },
});
