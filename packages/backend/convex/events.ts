/**
 * Events management - derived from trades
 *
 * Events are automatically created/updated when trades are recorded.
 * This provides a way to see only the events we're tracking via WebSocket.
 */
import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ============ INTERNAL MUTATIONS ============

export const upsertEvent = internalMutation({
  args: {
    eventSlug: v.string(),
    title: v.string(),
    imageUrl: v.optional(v.string()),
    tradeSize: v.number(),
    tradeTimestamp: v.number(),
  },
  returns: v.id("events"),
  handler: async (ctx, args): Promise<Id<"events">> => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastTradeAt: args.tradeTimestamp,
        tradeCount: existing.tradeCount + 1,
        totalVolume: existing.totalVolume + args.tradeSize,
        isActive: true,
        // Update title if we have a better one (non-empty)
        ...(args.title && args.title !== existing.title
          ? { title: args.title }
          : {}),
        // Update image if we have one and didn't before
        ...(args.imageUrl && !existing.imageUrl
          ? { imageUrl: args.imageUrl }
          : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("events", {
      eventSlug: args.eventSlug,
      title: args.title,
      imageUrl: args.imageUrl,
      isActive: true,
      firstTradeAt: args.tradeTimestamp,
      lastTradeAt: args.tradeTimestamp,
      tradeCount: 1,
      totalVolume: args.tradeSize,
    });
  },
});

// ============ INTERNAL QUERIES ============

export const getEventBySlugInternal = internalQuery({
  args: { eventSlug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("events"),
      _creationTime: v.number(),
      eventSlug: v.string(),
      title: v.string(),
      imageUrl: v.optional(v.string()),
      isActive: v.boolean(),
      firstTradeAt: v.number(),
      lastTradeAt: v.number(),
      tradeCount: v.number(),
      totalVolume: v.number(),
      closed: v.optional(v.boolean()),
      resolvedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .first();
  },
});

export const getUnclosedEvents = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Query events that are active and not yet closed
    return ctx.db
      .query("events")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.neq(q.field("closed"), true))
      .take(args.limit ?? 100);
  },
});

// ============ PUBLIC QUERIES ============

const eventValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  eventSlug: v.string(),
  title: v.string(),
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
  firstTradeAt: v.number(),
  lastTradeAt: v.number(),
  tradeCount: v.number(),
  totalVolume: v.number(),
  // Resolution tracking
  closed: v.optional(v.boolean()),
  resolvedAt: v.optional(v.number()),
});

export const listTrackedEvents = query({
  args: {
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("volume"))),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.array(eventValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const sortBy = args.sortBy ?? "recent";
    const activeOnly = args.activeOnly ?? false;

    let events: Doc<"events">[];

    if (activeOnly) {
      events = await ctx.db
        .query("events")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .take(limit * 2); // Fetch more for sorting
    } else if (sortBy === "volume") {
      events = await ctx.db
        .query("events")
        .withIndex("by_volume")
        .order("desc")
        .take(limit);
    } else {
      events = await ctx.db
        .query("events")
        .withIndex("by_last_trade")
        .order("desc")
        .take(limit);
    }

    // Sort by volume if requested
    if (sortBy === "volume" && activeOnly) {
      events = events
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, limit);
    }

    return events;
  },
});

export const getEventBySlug = query({
  args: { eventSlug: v.string() },
  returns: v.union(eventValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .first();
  },
});

const marketValidator = v.object({
  _id: v.id("markets"),
  _creationTime: v.number(),
  polymarketId: v.string(),
  conditionId: v.optional(v.string()),
  slug: v.string(),
  eventSlug: v.string(),
  title: v.string(),
  imageUrl: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastTradeAt: v.number(),
  lastAnalyzedAt: v.optional(v.number()),
  outcome: v.optional(
    v.union(v.literal("YES"), v.literal("NO"), v.literal("INVALID"), v.null()),
  ),
  resolvedAt: v.optional(v.number()),
});

export const getEventWithMarkets = query({
  args: { eventSlug: v.string() },
  returns: v.union(
    v.object({
      ...eventValidator.fields,
      markets: v.array(marketValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .first();

    if (!event) return null;

    const markets = await ctx.db
      .query("markets")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .collect();

    return { ...event, markets };
  },
});

export const getEventsWithSignalCounts = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      ...eventValidator.fields,
      marketCount: v.number(),
      signalCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_last_trade")
      .order("desc")
      .take(args.limit ?? 50);

    const results = await Promise.allSettled(
      events.map(async (event) => {
        // Get markets for this event
        const markets = await ctx.db
          .query("markets")
          .withIndex("by_event_slug", (q) => q.eq("eventSlug", event.eventSlug))
          .collect();

        // Count signals across all markets in parallel (avoid N+1)
        const signalCounts = await Promise.all(
          markets.map(async (market) => {
            const signals = await ctx.db
              .query("signals")
              .withIndex("by_market", (q) => q.eq("marketId", market._id))
              .collect();
            return signals.length;
          }),
        );
        const signalCount = signalCounts.reduce((sum, count) => sum + count, 0);

        return {
          ...event,
          marketCount: markets.length,
          signalCount,
        };
      }),
    );

    return results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<
          Doc<"events"> & { marketCount: number; signalCount: number }
        > => r.status === "fulfilled",
      )
      .map((r) => r.value);
  },
});

export const getEventStats = query({
  args: {},
  returns: v.object({
    totalEvents: v.number(),
    activeEvents: v.number(),
    totalTrades: v.number(),
    totalVolume: v.number(),
  }),
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();

    const activeEvents = events.filter((e) => e.isActive).length;
    const totalTrades = events.reduce((sum, e) => sum + e.tradeCount, 0);
    const totalVolume = events.reduce((sum, e) => sum + e.totalVolume, 0);

    return {
      totalEvents: events.length,
      activeEvents,
      totalTrades,
      totalVolume,
    };
  },
});
