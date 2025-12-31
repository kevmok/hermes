import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const getLatestInsights = query({
  args: {
    limit: v.optional(v.number()),
    onlyHighConfidence: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    if (args.onlyHighConfidence) {
      const insights = await ctx.db
        .query("insights")
        .withIndex("by_high_confidence", (q) => q.eq("isHighConfidence", true))
        .order("desc")
        .take(limit);

      return enrichInsightsWithMarkets(ctx, insights);
    }

    const insights = await ctx.db
      .query("insights")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return enrichInsightsWithMarkets(ctx, insights);
  },
});

export const getMarketInsights = query({
  args: {
    marketId: v.id("markets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("insights")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

export const getInsightWithPredictions = query({
  args: { insightId: v.id("insights") },
  handler: async (ctx, args) => {
    const insight = await ctx.db.get(args.insightId);
    if (!insight) return null;

    // Only fetch predictions if analysisRunId exists
    const predictions = insight.analysisRunId
      ? await ctx.db
          .query("modelPredictions")
          .withIndex("by_run", (q) =>
            q.eq("analysisRunId", insight.analysisRunId!),
          )
          .collect()
      : [];

    const market = await ctx.db.get(insight.marketId);
    const analysisRun = insight.analysisRunId
      ? await ctx.db.get(insight.analysisRunId)
      : null;

    return {
      ...insight,
      predictions,
      market,
      analysisRun,
    };
  },
});

export const getInsight = query({
  args: { insightId: v.id("insights") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.insightId);
  },
});

export const getLatestMarketInsight = query({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    const insight = await ctx.db
      .query("insights")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .first();

    if (!insight) return null;

    const market = await ctx.db.get(insight.marketId);
    return { ...insight, market };
  },
});

export const getInsightsByConfidenceLevel = query({
  args: {
    level: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("insights")
      .withIndex("by_confidence_level", (q) =>
        q.eq("confidenceLevel", args.level),
      )
      .order("desc")
      .take(args.limit ?? 20);

    return enrichInsightsWithMarkets(ctx, insights);
  },
});

export const getInsightsSince = internalQuery({
  args: {
    since: v.number(),
    onlyHighConfidence: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.onlyHighConfidence) {
      return await ctx.db
        .query("insights")
        .withIndex("by_high_confidence", (q) => q.eq("isHighConfidence", true))
        .filter((q) => q.gte(q.field("timestamp"), args.since))
        .collect();
    }

    return await ctx.db
      .query("insights")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), args.since))
      .collect();
  },
});

export const getAnalysisRequest = query({
  args: { requestId: v.id("analysisRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const market = await ctx.db.get(request.marketId);
    const insight = request.insightId
      ? await ctx.db.get(request.insightId)
      : null;

    return { ...request, market, insight };
  },
});

export const getPendingAnalysisRequests = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("analysisRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(args.limit ?? 50);

    const results = await Promise.allSettled(
      requests.map(async (request) => {
        const market = await ctx.db.get(request.marketId);
        return { ...request, market };
      }),
    );

    return results
      .filter(
        (
          r,
        ): r is PromiseFulfilledResult<
          (typeof requests)[0] & { market: Doc<"markets"> | null }
        > => r.status === "fulfilled",
      )
      .map((r) => r.value);
  },
});

// Helper to enrich insights with market data
async function enrichInsightsWithMarkets(
  ctx: QueryCtx,
  insights: Doc<"insights">[],
): Promise<(Doc<"insights"> & { market: Doc<"markets"> | null })[]> {
  const results = await Promise.allSettled(
    insights.map(async (insight) => {
      const market = await ctx.db.get(insight.marketId);
      return { ...insight, market };
    }),
  );

  return results
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Doc<"insights"> & { market: Doc<"markets"> | null }
      > => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
