import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { Effect } from "effect";
import { querySwarm, buildPrompt, type SwarmResponse } from "./ai/swarm";

// Trade context validator for signal creation
const tradeContextValidator = v.object({
  size: v.number(),
  price: v.number(),
  side: v.union(v.literal("YES"), v.literal("NO")),
  taker: v.optional(v.string()),
  timestamp: v.number(),
});

// ============ COLLECTOR MUTATIONS (called by lofn collector service) ============
// These are public mutations for the collector service to call via ConvexHttpClient.

export const createAnalysisRun = mutation({
  args: {
    triggerType: v.union(
      v.literal("scheduled"),
      v.literal("on_demand"),
      v.literal("system"),
    ),
  },
  handler: async (ctx, args) => {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return await ctx.db.insert("analysisRuns", {
      runId,
      triggerType: args.triggerType,
      status: "pending",
      marketsAnalyzed: 0,
      startedAt: Date.now(),
    });
  },
});

export const updateAnalysisRun = mutation({
  args: {
    runId: v.id("analysisRuns"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    marketsAnalyzed: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };

    if (args.marketsAnalyzed !== undefined) {
      updates.marketsAnalyzed = args.marketsAnalyzed;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.runId, updates);
  },
});

export const saveModelPrediction = mutation({
  args: {
    analysisRunId: v.id("analysisRuns"),
    marketId: v.id("markets"),
    modelName: v.string(),
    decision: v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
    reasoning: v.string(),
    responseTimeMs: v.number(),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("modelPredictions", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const saveInsight = mutation({
  args: {
    analysisRunId: v.optional(v.id("analysisRuns")),
    marketId: v.id("markets"),
    consensusDecision: v.union(
      v.literal("YES"),
      v.literal("NO"),
      v.literal("NO_TRADE"),
    ),
    consensusPercentage: v.number(),
    totalModels: v.number(),
    agreeingModels: v.number(),
    aggregatedReasoning: v.string(),
    priceAtAnalysis: v.number(),
  },
  handler: async (ctx, args) => {
    const confidenceLevel =
      args.consensusPercentage >= 80
        ? ("high" as const)
        : args.consensusPercentage >= 60
          ? ("medium" as const)
          : ("low" as const);

    const insightId = await ctx.db.insert("insights", {
      ...args,
      confidenceLevel,
      isHighConfidence: args.consensusPercentage >= 66,
      timestamp: Date.now(),
    });

    // Mark market as analyzed
    await ctx.db.patch(args.marketId, {
      lastAnalyzedAt: Date.now(),
    });

    return insightId;
  },
});

export const createAnalysisRequest = internalMutation({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("analysisRequests", {
      marketId: args.marketId,
      status: "pending",
      requestedAt: Date.now(),
    });
  },
});

export const updateAnalysisRequest = internalMutation({
  args: {
    requestId: v.id("analysisRequests"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    insightId: v.optional(v.id("insights")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, {
      status: args.status,
      insightId: args.insightId,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
  },
});

// ============ PUBLIC QUERIES ============

export const getAnalysisRun = query({
  args: { runId: v.id("analysisRuns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getRecentAnalysisRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analysisRuns")
      .withIndex("by_started_at")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const getMarketPredictions = query({
  args: {
    marketId: v.id("markets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelPredictions")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// ============ PUBLIC MUTATIONS ============

export const requestMarketAnalysis = mutation({
  args: { marketId: v.id("markets") },
  handler: async (ctx, args) => {
    // Check for existing recent insight (within 1 hour)
    const recentInsight = await ctx.db
      .query("insights")
      .withIndex("by_market_time", (q) =>
        q
          .eq("marketId", args.marketId)
          .gte("timestamp", Date.now() - 60 * 60 * 1000),
      )
      .first();

    if (recentInsight) {
      return {
        status: "completed" as const,
        insightId: recentInsight._id,
        cached: true,
      };
    }

    // Check for pending request
    const pendingRequest = await ctx.db
      .query("analysisRequests")
      .withIndex("by_market", (q) => q.eq("marketId", args.marketId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing"),
        ),
      )
      .first();

    if (pendingRequest) {
      return {
        status: "pending" as const,
        requestId: pendingRequest._id,
        cached: false,
      };
    }

    // Create new analysis request
    const requestId = await ctx.db.insert("analysisRequests", {
      marketId: args.marketId,
      status: "pending",
      requestedAt: Date.now(),
    });

    // Schedule the analysis (action will fetch prices from Polymarket API)
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.analysis.executeMarketAnalysisOnDemand,
        {
          requestId,
          marketId: args.marketId,
        },
      );
    } catch (error) {
      // If scheduling fails, mark request as failed
      console.error("Failed to schedule market analysis:", {
        marketId: args.marketId,
        error,
      });
      await ctx.db.patch(requestId, {
        status: "failed",
        errorMessage: "Failed to schedule analysis",
        completedAt: Date.now(),
      });
      return {
        status: "failed" as const,
        requestId,
        cached: false,
      };
    }

    return {
      status: "pending" as const,
      requestId,
      cached: false,
    };
  },
});

// ============ INTERNAL ACTIONS ============

// Analyze market using Effect.ts swarm
// Prices must be passed since markets table no longer stores volatile price data
export const analyzeMarketWithSwarm = internalAction({
  args: {
    marketId: v.id("markets"),
    yesPrice: v.number(),
    noPrice: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    insightId: v.optional(v.id("insights")),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    insightId?: Id<"insights">;
    error?: string;
  }> => {
    try {
      // Get market data
      const market = await ctx.runQuery(internal.markets.getMarketById, {
        marketId: args.marketId,
      });

      if (!market) {
        return { success: false, error: "Market not found" };
      }

      // Build prompts and query swarm using Effect.ts
      const { systemPrompt, userPrompt } = buildPrompt(market, {
        yesPrice: args.yesPrice,
        noPrice: args.noPrice,
      });
      const swarmResponse = await Effect.runPromise(
        querySwarm(systemPrompt, userPrompt) as Effect.Effect<SwarmResponse>,
      );

      // If no models responded, skip saving
      if (swarmResponse.totalModels === 0) {
        console.log(`No AI models configured for market ${market.title}`);
        return { success: false, error: "No AI models configured" };
      }

      // Use aggregated reasoning from structured response
      const aggregatedReasoning = swarmResponse.aggregatedReasoning;

      // Save insight directly (no analysisRun tracking for simplicity)
      const insightId: Id<"insights"> = await ctx.runMutation(
        api.analysis.saveInsight,
        {
          marketId: args.marketId,
          consensusDecision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
          totalModels: swarmResponse.totalModels,
          agreeingModels: swarmResponse.successfulModels,
          aggregatedReasoning,
          priceAtAnalysis: args.yesPrice,
        },
      );

      console.log(
        `Market ${market.title}: ${swarmResponse.consensusDecision} (${swarmResponse.consensusPercentage.toFixed(0)}% consensus)`,
      );

      return { success: true, insightId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Analysis failed for market ${args.marketId}:`,
        errorMessage,
      );
      return { success: false, error: errorMessage };
    }
  },
});

// Legacy executeMarketAnalysis - kept for on-demand requests with full tracking
// Prices must be passed since markets table no longer stores volatile price data
export const executeMarketAnalysis = internalAction({
  args: {
    requestId: v.optional(v.id("analysisRequests")),
    marketId: v.id("markets"),
    yesPrice: v.number(),
    noPrice: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    insightId: v.id("insights"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; insightId: Id<"insights"> }> => {
    // Create analysis run for tracking
    const runId: Id<"analysisRuns"> = await ctx.runMutation(
      api.analysis.createAnalysisRun,
      {
        triggerType: args.requestId ? "on_demand" : "system",
      },
    );

    try {
      await ctx.runMutation(api.analysis.updateAnalysisRun, {
        runId,
        status: "running",
      });

      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: "processing",
        });
      }

      // Get market data
      const market = await ctx.runQuery(api.markets.getMarket, {
        marketId: args.marketId,
      });

      if (!market) throw new ConvexError("Market not found");

      // Build prompts and query swarm
      const { systemPrompt, userPrompt } = buildPrompt(market, {
        yesPrice: args.yesPrice,
        noPrice: args.noPrice,
      });
      const swarmResponse = await Effect.runPromise(
        querySwarm(systemPrompt, userPrompt) as Effect.Effect<SwarmResponse>,
      );

      if (swarmResponse.totalModels === 0) {
        throw new ConvexError("No AI models configured");
      }

      // Save individual predictions for tracking (with structured data)
      for (const result of swarmResponse.results) {
        if (result.prediction) {
          await ctx.runMutation(api.analysis.saveModelPrediction, {
            analysisRunId: runId,
            marketId: args.marketId,
            modelName: result.modelName,
            decision: result.prediction.decision,
            reasoning: result.prediction.reasoning.summary,
            responseTimeMs: result.responseTimeMs,
            confidence: result.prediction.confidence,
          });
        }
      }

      // Use aggregated reasoning from structured response
      const aggregatedReasoning = swarmResponse.aggregatedReasoning;

      // Save insight
      const insightId: Id<"insights"> = await ctx.runMutation(
        api.analysis.saveInsight,
        {
          analysisRunId: runId,
          marketId: args.marketId,
          consensusDecision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
          totalModels: swarmResponse.totalModels,
          agreeingModels: swarmResponse.successfulModels,
          aggregatedReasoning,
          priceAtAnalysis: args.yesPrice,
        },
      );

      await ctx.runMutation(api.analysis.updateAnalysisRun, {
        runId,
        status: "completed",
        marketsAnalyzed: 1,
      });

      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: "completed",
          insightId,
        });
      }

      return { success: true, insightId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(api.analysis.updateAnalysisRun, {
        runId,
        status: "failed",
        errorMessage,
      });

      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: "failed",
          errorMessage,
        });
      }

      throw error;
    }
  },
});

// On-demand analysis that fetches prices from Polymarket API first
// Used by requestMarketAnalysis when user requests analysis without trade context
export const executeMarketAnalysisOnDemand = internalAction({
  args: {
    requestId: v.id("analysisRequests"),
    marketId: v.id("markets"),
  },
  returns: v.object({
    success: v.boolean(),
    insightId: v.optional(v.id("insights")),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    insightId?: Id<"insights">;
    error?: string;
  }> => {
    try {
      // Get market to find its slug for API lookup
      const market = await ctx.runQuery(api.markets.getMarket, {
        marketId: args.marketId,
      });

      if (!market) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: "failed",
          errorMessage: "Market not found",
        });
        return { success: false, error: "Market not found" };
      }

      // Fetch current prices from Polymarket API
      const marketData = await ctx.runAction(
        api.polymarket.markets.getMarketBySlug,
        {
          slug: market.slug,
        },
      );

      if (!marketData) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: "failed",
          errorMessage: "Could not fetch market prices from Polymarket API",
        });
        return { success: false, error: "Could not fetch market prices" };
      }

      // Extract prices from API response
      const yesPrice = parseFloat(marketData.outcomePrices?.[0] ?? "0.5");
      const noPrice = parseFloat(marketData.outcomePrices?.[1] ?? "0.5");

      // Now execute the full analysis with prices
      const result = await ctx.runAction(
        internal.analysis.executeMarketAnalysis,
        {
          requestId: args.requestId,
          marketId: args.marketId,
          yesPrice,
          noPrice,
        },
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
        requestId: args.requestId,
        status: "failed",
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

// ============ SIGNAL CREATION (Whale Trade Triggered) ============

// Analyze a whale trade and create a signal with trade context
export const analyzeTradeForSignal = internalAction({
  args: {
    marketId: v.id("markets"),
    tradeContext: tradeContextValidator,
  },
  returns: v.object({
    success: v.boolean(),
    signalId: v.optional(v.id("signals")),
    skipped: v.optional(v.boolean()),
    reason: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    signalId?: Id<"signals">;
    skipped?: boolean;
    reason?: string;
  }> => {
    try {
      // Get global filters config
      const filters = await ctx.runQuery(
        internal.globalFilters.getFiltersInternal,
        {},
      );

      // Check if signal generation is enabled
      if (!filters.isEnabled) {
        return {
          success: true,
          skipped: true,
          reason: "Signal generation disabled",
        };
      }

      // Check deduplication - is there a recent signal for this market?
      const recentSignal = await ctx.runQuery(
        api.signals.getRecentSignalForMarket,
        {
          marketId: args.marketId,
          withinMs: filters.deduplicationWindowMs,
        },
      );

      if (recentSignal) {
        // Aggregate the trade to existing signal instead of creating new one
        await ctx.runMutation(internal.signals.aggregateTradeToSignal, {
          signalId: recentSignal._id,
          newTrade: args.tradeContext,
        });
        return {
          success: true,
          skipped: true,
          reason: "Trade aggregated to existing signal",
          signalId: recentSignal._id,
        };
      }

      // Get market data
      const market = await ctx.runQuery(internal.markets.getMarketById, {
        marketId: args.marketId,
      });

      if (!market) {
        return { success: false, reason: "Market not found" };
      }

      // Use price from trade context - this is the price at the moment of the trade
      const tradePrice = args.tradeContext.price;
      // For binary markets: YES price is the trade price for YES side, or 1 - price for NO side
      const yesPrice =
        args.tradeContext.side === "YES" ? tradePrice : 1 - tradePrice;
      const noPrice = 1 - yesPrice;

      // Build prompts and query swarm using Effect.ts
      const { systemPrompt, userPrompt } = buildPrompt(market, {
        yesPrice,
        noPrice,
      });
      const swarmResponse = await Effect.runPromise(
        querySwarm(systemPrompt, userPrompt) as Effect.Effect<SwarmResponse>,
      );

      // If no models responded, skip signal creation
      if (swarmResponse.totalModels === 0) {
        console.log(`No AI models configured for market ${market.title}`);
        return { success: false, reason: "No AI models configured" };
      }

      // Check minimum consensus threshold per design decisions
      if (swarmResponse.consensusPercentage < filters.minConsensusPercentage) {
        console.log(
          `Skipping signal - consensus ${swarmResponse.consensusPercentage.toFixed(0)}% below threshold ${filters.minConsensusPercentage}%`,
        );
        return {
          success: true,
          skipped: true,
          reason: `Consensus ${swarmResponse.consensusPercentage.toFixed(0)}% below ${filters.minConsensusPercentage}% threshold`,
        };
      }

      // Use aggregated reasoning from structured response
      const aggregatedReasoning = swarmResponse.aggregatedReasoning;

      // Create signal with trade context and structured AI consensus data
      const signalId: Id<"signals"> = await ctx.runMutation(
        internal.signals.createSignal,
        {
          marketId: args.marketId,
          triggerTrade: args.tradeContext,
          consensusDecision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
          totalModels: swarmResponse.totalModels,
          agreeingModels: swarmResponse.successfulModels,
          aggregatedReasoning,
          priceAtTrigger: yesPrice,
          // NEW: Structured output fields
          voteDistribution: swarmResponse.voteDistribution,
          averageConfidence: swarmResponse.averageConfidence,
          confidenceRange: swarmResponse.confidenceRange,
          aggregatedKeyFactors: swarmResponse.aggregatedKeyFactors,
          aggregatedRisks: swarmResponse.aggregatedRisks,
        },
      );

      console.log(
        `Signal created for ${market.title}: ${swarmResponse.consensusDecision} (${swarmResponse.consensusPercentage.toFixed(0)}% consensus)`,
      );

      // Also mark market as analyzed
      await ctx.runMutation(api.markets.markMarketAnalyzed, {
        marketId: args.marketId,
      });

      return { success: true, signalId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Signal analysis failed for market ${args.marketId}:`,
        errorMessage,
      );
      return { success: false, reason: errorMessage };
    }
  },
});
