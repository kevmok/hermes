import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Polymarket Gamma API types
interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  outcomes: string[];
  outcome_prices: string[];
  active: boolean;
  closed: boolean;
  resolved: boolean;
  resolution: string | null; // "Yes" | "No" | null
  resolution_source?: string;
  end_date_iso?: string;
}

// ============ HELPER FUNCTIONS ============

function parseResolution(resolution: string | null): "YES" | "NO" | null {
  if (!resolution) return null;
  const upper = resolution.toUpperCase();
  if (upper === "YES" || upper === "TRUE" || upper === "1") return "YES";
  if (upper === "NO" || upper === "FALSE" || upper === "0") return "NO";
  return null;
}

// ============ EXTERNAL API CALL ============

export const fetchResolvedMarkets = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      conditionId: v.string(),
      outcome: v.union(v.literal("YES"), v.literal("NO"), v.null()),
      resolutionSource: v.optional(v.string()),
    }),
  ),
  handler: async (
    _ctx,
    args,
  ): Promise<
    Array<{
      conditionId: string;
      outcome: "YES" | "NO" | null;
      resolutionSource?: string;
    }>
  > => {
    const limit = args.limit ?? 100;

    try {
      // Polymarket Gamma API endpoint for resolved markets
      const url = `https://gamma-api.polymarket.com/markets?resolved=true&limit=${limit}&order=desc&sort=end_date_iso`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Gamma API error: ${response.status}`);
        return [];
      }

      const markets = (await response.json()) as GammaMarket[];

      return markets
        .filter((m) => m.resolved && m.resolution)
        .map((m) => ({
          conditionId: m.condition_id,
          outcome: parseResolution(m.resolution),
          resolutionSource: m.resolution_source || "polymarket_gamma",
        }));
    } catch (error) {
      console.error("Failed to fetch resolved markets:", error);
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

// ============ SCHEDULED JOB ============

export const runResolutionUpdater = internalAction({
  args: {},
  returns: v.object({
    fetchedCount: v.number(),
    updatedCount: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (
    ctx,
  ): Promise<{
    fetchedCount: number;
    updatedCount: number;
    errors: string[];
  }> => {
    const errors: string[] = [];

    // Fetch recently resolved markets from Polymarket
    const resolvedMarkets = await ctx.runAction(
      internal.resolution.fetchResolvedMarkets,
      { limit: 200 },
    );

    console.log(
      `Fetched ${resolvedMarkets.length} resolved markets from Polymarket`,
    );

    let updatedCount = 0;

    for (const resolved of resolvedMarkets) {
      try {
        const result = await ctx.runMutation(
          internal.resolution.updateMarketResolution,
          {
            polymarketId: resolved.conditionId,
            outcome: resolved.outcome,
            resolutionSource: resolved.resolutionSource,
          },
        );

        if (result) {
          updatedCount++;
        }
      } catch (error) {
        errors.push(`Failed to update ${resolved.conditionId}: ${error}`);
      }
    }

    console.log(
      `Resolution update complete: ${updatedCount} markets updated, ${errors.length} errors`,
    );

    return {
      fetchedCount: resolvedMarkets.length,
      updatedCount,
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
