/**
 * Convex actions for Polymarket Events API
 *
 * Internal actions fetch from the API directly.
 * Public actions use ActionCache for TTL-based caching.
 */
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api as polymarketApi } from "./client";
import { eventBySlugCache, eventByIdCache } from "./cache";

// ============ INTERNAL ACTIONS (used by cache) ============

export const fetchEventBySlug = internalAction({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getEventBySlug(args.slug);
  },
});

export const fetchEventById = internalAction({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getEventById(args.id);
  },
});

// ============ PUBLIC ACTIONS (cached) ============

export const getEventBySlug = action({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return eventBySlugCache.fetch(ctx, { slug: args.slug });
  },
});

export const getEventById = action({
  args: { id: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return eventByIdCache.fetch(ctx, { id: args.id });
  },
});

// List events - not cached (always fresh for browsing)
export const listEvents = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    active: v.optional(v.boolean()),
    closed: v.optional(v.boolean()),
    order: v.optional(v.string()),
    ascending: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.listEvents({
      limit: args.limit,
      offset: args.offset,
      active: args.active,
      closed: args.closed,
      order: args.order,
      ascending: args.ascending,
    });
  },
});

// ============ CACHE MANAGEMENT ============

export const invalidateEventBySlug = action({
  args: { slug: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await eventBySlugCache.remove(ctx, { slug: args.slug });
    return null;
  },
});

export const invalidateEventById = action({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await eventByIdCache.remove(ctx, { id: args.id });
    return null;
  },
});
