/**
 * Convex actions for Polymarket User Data API
 *
 * Internal actions fetch from the API directly.
 * Public actions use ActionCache for TTL-based caching.
 */
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api as polymarketApi } from "./client";
import {
  userPositionsCache,
  userTradesCache,
  userActivityCache,
  portfolioValueCache,
  closedPositionsCache,
  leaderboardCache,
} from "./cache";

// ============ INTERNAL ACTIONS (used by cache) ============

export const fetchUserPositions = internalAction({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sizeThreshold: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal("ASC"), v.literal("DESC"))),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getUserPositions(args.user, {
      limit: args.limit,
      offset: args.offset,
      sizeThreshold: args.sizeThreshold,
      sortBy: args.sortBy,
      sortDirection: args.sortDirection,
    });
  },
});

export const fetchUserTrades = internalAction({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    side: v.optional(v.union(v.literal("BUY"), v.literal("SELL"))),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getUserTrades(args.user, {
      limit: args.limit,
      offset: args.offset,
      side: args.side,
    });
  },
});

export const fetchUserActivity = internalAction({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    type: v.optional(v.string()),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getUserActivity(args.user, {
      limit: args.limit,
      offset: args.offset,
      type: args.type,
      start: args.start,
      end: args.end,
    });
  },
});

export const fetchPortfolioValue = internalAction({
  args: { user: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getPortfolioValue(args.user);
  },
});

export const fetchClosedPositions = internalAction({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal("ASC"), v.literal("DESC"))),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getClosedPositions(args.user, {
      limit: args.limit,
      offset: args.offset,
      sortBy: args.sortBy,
      sortDirection: args.sortDirection,
    });
  },
});

export const fetchLeaderboard = internalAction({
  args: {
    category: v.optional(v.string()),
    timePeriod: v.optional(v.string()),
    orderBy: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (_ctx, args) => {
    return polymarketApi.getLeaderboard({
      category: args.category,
      timePeriod: args.timePeriod,
      orderBy: args.orderBy,
      limit: args.limit,
      offset: args.offset,
    });
  },
});

// ============ PUBLIC ACTIONS (cached) ============

export const getUserPositions = action({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sizeThreshold: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal("ASC"), v.literal("DESC"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return userPositionsCache.fetch(ctx, args);
  },
});

export const getUserTrades = action({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    side: v.optional(v.union(v.literal("BUY"), v.literal("SELL"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return userTradesCache.fetch(ctx, args);
  },
});

export const getUserActivity = action({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    type: v.optional(v.string()),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return userActivityCache.fetch(ctx, args);
  },
});

export const getPortfolioValue = action({
  args: { user: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return portfolioValueCache.fetch(ctx, args);
  },
});

export const getClosedPositions = action({
  args: {
    user: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.union(v.literal("ASC"), v.literal("DESC"))),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return closedPositionsCache.fetch(ctx, args);
  },
});

export const getLeaderboard = action({
  args: {
    category: v.optional(v.string()),
    timePeriod: v.optional(v.string()),
    orderBy: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return leaderboardCache.fetch(ctx, args);
  },
});

// ============ CACHE MANAGEMENT ============

export const invalidateUserPositions = action({
  args: { user: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await userPositionsCache.remove(ctx, { user: args.user });
    return null;
  },
});

export const invalidateUserData = action({
  args: { user: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all([
      userPositionsCache.remove(ctx, { user: args.user }),
      userTradesCache.remove(ctx, { user: args.user }),
      userActivityCache.remove(ctx, { user: args.user }),
      portfolioValueCache.remove(ctx, { user: args.user }),
      closedPositionsCache.remove(ctx, { user: args.user }),
    ]);
    return null;
  },
});
