import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { api as polymarketApi } from "./polymarket/client";

// ============ HELPER FUNCTIONS ============

/**
 * Parse outcome from outcomePrices JSON array.
 * When a market is resolved, one outcome will be ~1.0 and the other ~0.0.
 * outcomePrices format: "[\"0.95\", \"0.05\"]" where index 0 = YES, index 1 = NO
 */
function parseOutcomeFromPrices(
  outcomePrices: string | null | undefined,
): "YES" | "NO" | null {
  if (!outcomePrices) return null;

  try {
    const prices = JSON.parse(outcomePrices) as string[];
    if (!Array.isArray(prices) || prices.length < 2) return null;

    const yesPrice = parseFloat(prices[0]);
    const noPrice = parseFloat(prices[1]);

    // Threshold for considering a price as "resolved" (won)
    const RESOLUTION_THRESHOLD = 0.95;

    if (yesPrice >= RESOLUTION_THRESHOLD) return "YES";
    if (noPrice >= RESOLUTION_THRESHOLD) return "NO";

    return null; // Not clearly resolved yet
  } catch {
    return null;
  }
}

// ============ MARKET RESOLUTION CHECK ============

export const checkMarketResolutions = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      conditionId: v.string(),
      outcome: v.union(v.literal("YES"), v.literal("NO"), v.null()),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ conditionId: string; outcome: "YES" | "NO" | null }>> => {
    // 1. Get unresolved markets from our DB
    const unresolvedMarkets = await ctx.runQuery(
      internal.markets.getUnresolvedMarkets,
      { limit: args.limit ?? 100 },
    );

    if (unresolvedMarkets.length === 0) {
      console.log("No unresolved markets to check");
      return [];
    }

    // 2. Extract condition IDs (filter out undefined)
    const conditionIds = unresolvedMarkets
      .map((m) => m.conditionId)
      .filter((id): id is string => !!id);

    if (conditionIds.length === 0) {
      console.log("No markets with condition IDs to check");
      return [];
    }

    console.log(
      `Checking resolution status for ${conditionIds.length} markets`,
    );

    try {
      // 3. Fetch current status from Polymarket API using valid condition_ids param
      const apiMarkets =
        await polymarketApi.getMarketsByConditionIds(conditionIds);

      console.log(
        `Fetched ${apiMarkets.length} markets from API, checking for resolved...`,
      );

      // 4. Find newly resolved markets (closed with clear outcome from prices)
      const resolved: Array<{
        conditionId: string;
        outcome: "YES" | "NO" | null;
      }> = [];

      for (const m of apiMarkets) {
        // Market must be closed to be resolved
        if (!m.closed) continue;

        const outcome = parseOutcomeFromPrices(m.outcomePrices);
        if (outcome) {
          resolved.push({
            conditionId: m.conditionId,
            outcome,
          });
          console.log(
            `Market ${m.conditionId} resolved: ${outcome} (prices: ${m.outcomePrices})`,
          );
        }
      }

      console.log(`Found ${resolved.length} newly resolved markets`);
      return resolved;
    } catch (error) {
      console.error("Failed to check market resolutions:", error);
      return [];
    }
  },
});

// ============ EVENT RESOLUTION CHECK ============

export const checkEventResolutions = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      slug: v.union(v.string(), v.null()),
      closed: v.boolean(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<Array<{ slug: string | null; closed: boolean }>> => {
    // 1. Get unclosed events from our DB
    const unclosedEvents = await ctx.runQuery(
      internal.events.getUnclosedEvents,
      { limit: args.limit ?? 100 },
    );

    if (unclosedEvents.length === 0) {
      console.log("No unclosed events to check");
      return [];
    }

    const slugs = unclosedEvents.map((e) => e.eventSlug);
    console.log(`Checking resolution status for ${slugs.length} events`);

    try {
      // 2. Fetch current status from Polymarket API
      const apiEvents = await polymarketApi.getEventsBySlugs(slugs);

      // 3. Find newly closed events
      const closed = apiEvents
        .filter((e) => e.closed || e.ended)
        .map((e) => ({ slug: e.slug ?? null, closed: true }));

      console.log(`Found ${closed.length} newly closed events`);
      return closed;
    } catch (error) {
      console.error("Failed to check event resolutions:", error);
      return [];
    }
  },
});

// ============ INTERNAL MUTATIONS ============

export const updateMarketResolution = internalMutation({
  args: {
    polymarketId: v.string(),
    outcome: v.union(v.literal("YES"), v.literal("NO"), v.null()),
    resolutionSource: v.optional(v.string()),
  },
  returns: v.union(v.id("markets"), v.null()),
  handler: async (ctx, args): Promise<Id<"markets"> | null> => {
    const market = await ctx.db
      .query("markets")
      .withIndex("by_polymarket_id", (q) =>
        q.eq("polymarketId", args.polymarketId),
      )
      .first();

    if (!market) {
      // Market not in our database - that's fine, we only track markets we've seen trades on
      return null;
    }

    // Skip if already resolved with same outcome
    if (market.outcome === args.outcome) {
      return market._id;
    }

    await ctx.db.patch(market._id, {
      outcome: args.outcome,
      resolvedAt: Date.now(),
      isActive: false,
      updatedAt: Date.now(),
    });

    console.log(
      `Updated market "${market.title.slice(0, 50)}" with outcome: ${args.outcome}`,
    );
    return market._id;
  },
});

export const updateEventResolution = internalMutation({
  args: {
    eventSlug: v.string(),
    closed: v.boolean(),
  },
  returns: v.union(v.id("events"), v.null()),
  handler: async (ctx, args): Promise<Id<"events"> | null> => {
    const event = await ctx.db
      .query("events")
      .withIndex("by_event_slug", (q) => q.eq("eventSlug", args.eventSlug))
      .first();

    if (!event) {
      // Event not in our database
      return null;
    }

    // Skip if already in same state
    if (event.closed === args.closed) {
      return event._id;
    }

    await ctx.db.patch(event._id, {
      closed: args.closed,
      isActive: !args.closed,
      resolvedAt: Date.now(),
    });

    console.log(
      `Updated event "${event.title.slice(0, 50)}" - closed: ${args.closed}`,
    );
    return event._id;
  },
});

// ============ SCHEDULED JOB ============

export const runResolutionUpdater = internalAction({
  args: {},
  returns: v.object({
    marketsChecked: v.number(),
    marketsUpdated: v.number(),
    eventsChecked: v.number(),
    eventsUpdated: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (
    ctx,
  ): Promise<{
    marketsChecked: number;
    marketsUpdated: number;
    eventsChecked: number;
    eventsUpdated: number;
    errors: string[];
  }> => {
    const errors: string[] = [];

    // === MARKET RESOLUTION CHECK ===
    // Check our tracked unresolved markets against Polymarket API
    const resolvedMarkets = await ctx.runAction(
      internal.resolution.checkMarketResolutions,
      { limit: 100 },
    );

    console.log(`Found ${resolvedMarkets.length} newly resolved markets`);

    let marketsUpdated = 0;

    for (const resolved of resolvedMarkets) {
      try {
        const result = await ctx.runMutation(
          internal.resolution.updateMarketResolution,
          {
            polymarketId: resolved.conditionId,
            outcome: resolved.outcome,
          },
        );

        if (result) {
          marketsUpdated++;
        }
      } catch (error) {
        errors.push(
          `Failed to update market ${resolved.conditionId}: ${error}`,
        );
      }
    }

    // === EVENT RESOLUTION CHECK ===
    // Check our tracked unclosed events against Polymarket API
    const closedEvents = await ctx.runAction(
      internal.resolution.checkEventResolutions,
      { limit: 100 },
    );

    console.log(`Found ${closedEvents.length} newly closed events`);

    let eventsUpdated = 0;

    for (const event of closedEvents) {
      if (!event.slug) continue;

      try {
        const result = await ctx.runMutation(
          internal.resolution.updateEventResolution,
          {
            eventSlug: event.slug,
            closed: event.closed,
          },
        );

        if (result) {
          eventsUpdated++;
        }
      } catch (error) {
        errors.push(`Failed to update event ${event.slug}: ${error}`);
      }
    }

    console.log(
      `Resolution update complete: ${marketsUpdated} markets, ${eventsUpdated} events updated, ${errors.length} errors`,
    );

    return {
      marketsChecked: resolvedMarkets.length,
      marketsUpdated,
      eventsChecked: closedEvents.length,
      eventsUpdated,
      errors,
    };
  },
});

// ============ PUBLIC QUERIES ============

export const getResolutionStatus = query({
  args: {},
  handler: async (ctx) => {
    const resolvedMarkets = await ctx.db
      .query("markets")
      .withIndex("by_resolved")
      .filter((q) => q.neq(q.field("outcome"), undefined))
      .take(1000);

    const unresolvedWithSignals = await ctx.db
      .query("markets")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.eq(q.field("outcome"), undefined))
      .take(1000);

    // Find the most recent resolution
    const sortedResolved = resolvedMarkets.sort(
      (a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0),
    );

    return {
      resolvedCount: resolvedMarkets.length,
      unresolvedActiveCount: unresolvedWithSignals.length,
      lastResolutionAt: sortedResolved[0]?.resolvedAt ?? null,
      recentResolutions: sortedResolved.slice(0, 5).map((m) => ({
        _id: m._id,
        title: m.title,
        outcome: m.outcome,
        resolvedAt: m.resolvedAt,
      })),
    };
  },
});

// ============ MANUAL TRIGGER ============

export const triggerResolutionUpdate = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.resolution.runResolutionUpdater,
      {},
    );
    return { scheduled: true, scheduledAt: Date.now() };
  },
});
