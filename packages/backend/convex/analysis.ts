import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import { Effect } from "effect";
import { action } from "./_generated/server";
import {
  querySwarm,
  queryQuickSwarm,
  queryEventSwarm,
  buildPrompt,
  buildEventPrompt,
  type SwarmResponse,
  type EventAnalysisResponse,
  type MarketWithPrice,
} from "./ai/swarm";

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

export const requestQuickAnalysis = action({
  args: { marketId: v.id("markets") },
  returns: v.object({
    success: v.boolean(),
    insightId: v.optional(v.id("insights")),
    cached: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    insightId?: Id<"insights">;
    cached?: boolean;
    error?: string;
  }> => {
    try {
      const recentInsight = await ctx.runQuery(
        internal.insights.getRecentInsightForMarket,
        {
          marketId: args.marketId,
          withinMs: 15 * 60 * 1000,
        },
      );

      if (recentInsight) {
        return {
          success: true,
          insightId: recentInsight._id,
          cached: true,
        };
      }

      const market = await ctx.runQuery(api.markets.getMarket, {
        marketId: args.marketId,
      });

      if (!market) {
        return { success: false, error: "Market not found" };
      }

      const marketData = await ctx.runAction(
        api.polymarket.markets.getMarketBySlug,
        { slug: market.slug },
      );

      if (!marketData) {
        return { success: false, error: "Could not fetch market prices" };
      }

      const yesPrice = parseFloat(marketData.outcomePrices?.[0] ?? "0.5");
      const noPrice = parseFloat(marketData.outcomePrices?.[1] ?? "0.5");

      const { systemPrompt, userPrompt } = buildPrompt(market, {
        yesPrice,
        noPrice,
      });

      const swarmResponse = await Effect.runPromise(
        queryQuickSwarm(systemPrompt, userPrompt) as Effect.Effect<SwarmResponse>,
      );

      if (swarmResponse.totalModels === 0) {
        return { success: false, error: "No AI models configured" };
      }

      const insightId: Id<"insights"> = await ctx.runMutation(
        api.analysis.saveInsight,
        {
          marketId: args.marketId,
          consensusDecision: swarmResponse.consensusDecision,
          consensusPercentage: swarmResponse.consensusPercentage,
          totalModels: swarmResponse.totalModels,
          agreeingModels: swarmResponse.successfulModels,
          aggregatedReasoning: swarmResponse.aggregatedReasoning,
          priceAtAnalysis: yesPrice,
        },
      );

      console.log(
        `Quick analysis for ${market.title}: ${swarmResponse.consensusDecision} (${swarmResponse.consensusPercentage.toFixed(0)}% consensus)`,
      );

      return { success: true, insightId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Quick analysis failed for market ${args.marketId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  },
});

const eventAnalysisResultValidator = v.object({
  eventSummary: v.string(),
  marketCorrelations: v.string(),
  topOpportunity: v.optional(
    v.object({
      marketSlug: v.string(),
      reason: v.string(),
    }),
  ),
  risks: v.array(v.string()),
  markets: v.array(
    v.object({
      marketSlug: v.string(),
      decision: v.union(v.literal("YES"), v.literal("NO"), v.literal("NO_TRADE")),
      confidence: v.number(),
      keyFactors: v.array(v.string()),
      edgeAssessment: v.object({
        hasEdge: v.boolean(),
        edgeSize: v.number(),
        direction: v.union(
          v.literal("underpriced"),
          v.literal("overpriced"),
          v.literal("fair"),
        ),
      }),
    }),
  ),
});

export const analyzeEvent = action({
  args: { eventSlug: v.string() },
  returns: v.object({
    success: v.boolean(),
    result: v.optional(eventAnalysisResultValidator),
    insightsCreated: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    result?: {
      eventSummary: string;
      marketCorrelations: string;
      topOpportunity?: { marketSlug: string; reason: string };
      risks: string[];
      markets: Array<{
        marketSlug: string;
        decision: "YES" | "NO" | "NO_TRADE";
        confidence: number;
        keyFactors: string[];
        edgeAssessment: {
          hasEdge: boolean;
          edgeSize: number;
          direction: "underpriced" | "overpriced" | "fair";
        };
      }>;
    };
    insightsCreated?: number;
    error?: string;
  }> => {
    try {
      const event = await ctx.runQuery(api.events.getEventBySlug, {
        eventSlug: args.eventSlug,
      });

      if (!event) {
        return { success: false, error: "Event not found" };
      }

      const markets = await ctx.runQuery(api.markets.getMarketsByEventSlug, {
        eventSlug: args.eventSlug,
      });

      if (!markets || markets.length === 0) {
        return { success: false, error: "No markets found for this event" };
      }

      const marketsWithPrices: MarketWithPrice[] = [];
      for (const market of markets) {
        const marketData = await ctx.runAction(
          api.polymarket.markets.getMarketBySlug,
          { slug: market.slug },
        );

        if (marketData) {
          marketsWithPrices.push({
            slug: market.slug,
            title: market.title,
            yesPrice: parseFloat(marketData.outcomePrices?.[0] ?? "0.5"),
            noPrice: parseFloat(marketData.outcomePrices?.[1] ?? "0.5"),
            isActive: market.isActive,
          });
        }
      }

      if (marketsWithPrices.length === 0) {
        return { success: false, error: "Could not fetch prices for any markets" };
      }

      const { systemPrompt, userPrompt } = buildEventPrompt(
        { title: event.title, eventSlug: event.eventSlug },
        marketsWithPrices,
      );

      const response = await Effect.runPromise(
        queryEventSwarm(systemPrompt, userPrompt) as Effect.Effect<EventAnalysisResponse>,
      );

      if (!response.success || !response.analysis) {
        return { success: false, error: response.error || "Analysis failed" };
      }

      let insightsCreated = 0;
      for (const marketAnalysis of response.analysis.markets) {
        const market = markets.find((m: { slug: string }) => m.slug === marketAnalysis.marketSlug);
        if (!market) continue;

        const priceInfo = marketsWithPrices.find((m: MarketWithPrice) => m.slug === marketAnalysis.marketSlug);
        if (!priceInfo) continue;

        const aggregatedReasoning = [
          `Event context: ${response.analysis.eventSummary}`,
          `Key factors: ${marketAnalysis.keyFactors.join("; ")}`,
          marketAnalysis.edgeAssessment.hasEdge
            ? `Edge: ${marketAnalysis.edgeAssessment.direction} by ${Math.abs(marketAnalysis.edgeAssessment.edgeSize).toFixed(1)}pp`
            : "No significant edge detected",
        ].join(" | ");

        await ctx.runMutation(api.analysis.saveInsight, {
          marketId: market._id,
          consensusDecision: marketAnalysis.decision,
          consensusPercentage: marketAnalysis.confidence,
          totalModels: 3,
          agreeingModels: Math.ceil((marketAnalysis.confidence / 100) * 3),
          aggregatedReasoning,
          priceAtAnalysis: priceInfo.yesPrice,
        });

        insightsCreated++;
      }

      console.log(
        `Event analysis for ${event.title}: ${insightsCreated} insights created`,
      );

      const mutableResult = {
        eventSummary: response.analysis.eventSummary,
        marketCorrelations: response.analysis.marketCorrelations,
        topOpportunity: response.analysis.topOpportunity
          ? {
              marketSlug: response.analysis.topOpportunity.marketSlug,
              reason: response.analysis.topOpportunity.reason,
            }
          : undefined,
        risks: [...response.analysis.risks],
        markets: response.analysis.markets.map((m) => ({
          marketSlug: m.marketSlug,
          decision: m.decision,
          confidence: m.confidence,
          keyFactors: [...m.keyFactors],
          edgeAssessment: {
            hasEdge: m.edgeAssessment.hasEdge,
            edgeSize: m.edgeAssessment.edgeSize,
            direction: m.edgeAssessment.direction,
          },
        })),
      };

      return {
        success: true,
        result: mutableResult,
        insightsCreated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Event analysis failed for ${args.eventSlug}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
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

export const processBatchAnalysis = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
    failed: v.number(),
    markets: v.array(v.string()),
  }),
  handler: async (
    ctx,
  ): Promise<{
    processed: number;
    skipped: number;
    failed: number;
    markets: string[];
  }> => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.log(`[BATCH:${batchId}] Starting batch analysis...`);

    const pendingItems: Doc<"analysisQueue">[] = await ctx.runQuery(
      internal.analysis.getPendingQueueItems,
      {},
    );

    if (pendingItems.length === 0) {
      console.log(`[BATCH:${batchId}] No pending items in queue`);
      return { processed: 0, skipped: 0, failed: 0, markets: [] };
    }

    console.log(
      `[BATCH:${batchId}] Found ${pendingItems.length} pending items`,
    );

    const marketIds: Id<"markets">[] = [
      ...new Set(pendingItems.map((item: Doc<"analysisQueue">) => item.marketId)),
    ];
    const heatScores: { marketId: Id<"markets">; heatScore: number }[] =
      await ctx.runQuery(internal.analysis.getMarketHeatScores, { marketIds });

    const sortedMarkets = marketIds
      .map((id: Id<"markets">) => ({
        marketId: id,
        heat:
          heatScores.find(
            (h: { marketId: Id<"markets">; heatScore: number }) =>
              h.marketId === id,
          )?.heatScore ?? 0,
      }))
      .sort(
        (
          a: { marketId: Id<"markets">; heat: number },
          b: { marketId: Id<"markets">; heat: number },
        ) => b.heat - a.heat,
      );

    const MAX_MARKETS_PER_BATCH = 5;
    const marketsToAnalyze = sortedMarkets.slice(0, MAX_MARKETS_PER_BATCH);

    console.log(
      `[BATCH:${batchId}] Analyzing top ${marketsToAnalyze.length} markets by heat score`,
    );

    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const analyzedMarkets: string[] = [];

    for (const { marketId } of marketsToAnalyze) {
      const marketItems = pendingItems.filter(
        (item: Doc<"analysisQueue">) => item.marketId === marketId,
      );
      const latestItem = marketItems.sort(
        (a: Doc<"analysisQueue">, b: Doc<"analysisQueue">) =>
          b.queuedAt - a.queuedAt,
      )[0];

      if (!latestItem) continue;

      await ctx.runMutation(internal.analysis.markQueueItemProcessing, {
        itemId: latestItem._id,
        batchId,
      });

      const market = await ctx.runQuery(internal.markets.getMarketById, {
        marketId,
      });

      if (!market) {
        await ctx.runMutation(internal.analysis.markQueueItemCompleted, {
          itemId: latestItem._id,
          status: "skipped",
        });
        skipped++;
        continue;
      }

      const cooldownHours = 4;
      if (
        market.lastAnalyzedAt &&
        Date.now() - market.lastAnalyzedAt < cooldownHours * 60 * 60 * 1000
      ) {
        console.log(
          `[BATCH:${batchId}] Skipping ${market.title.slice(0, 30)}... - analyzed recently`,
        );
        await ctx.runMutation(internal.analysis.markQueueItemCompleted, {
          itemId: latestItem._id,
          status: "skipped",
        });
        skipped++;
        continue;
      }

      try {
        const tradeContext = {
          size: latestItem.tradeSize,
          price: latestItem.tradePrice,
          side: latestItem.tradeSide,
          timestamp: latestItem.queuedAt,
        };

        const result = await ctx.runAction(
          internal.analysis.analyzeTradeForSignal,
          { marketId, tradeContext },
        );

        if (result.success && !result.skipped) {
          processed++;
          analyzedMarkets.push(market.title);
          console.log(
            `[BATCH:${batchId}] Analyzed: ${market.title.slice(0, 40)}...`,
          );
        } else {
          skipped++;
          console.log(
            `[BATCH:${batchId}] Skipped: ${market.title.slice(0, 40)}... - ${result.reason}`,
          );
        }

        await ctx.runMutation(internal.analysis.markQueueItemCompleted, {
          itemId: latestItem._id,
          status: "completed",
        });
      } catch (error) {
        failed++;
        console.error(
          `[BATCH:${batchId}] Failed: ${market.title.slice(0, 40)}...`,
          error,
        );
        await ctx.runMutation(internal.analysis.markQueueItemCompleted, {
          itemId: latestItem._id,
          status: "skipped",
        });
      }

      for (const item of marketItems) {
        if (item._id !== latestItem._id) {
          await ctx.runMutation(internal.analysis.markQueueItemCompleted, {
            itemId: item._id,
            status: "skipped",
          });
        }
      }
    }

    await ctx.runMutation(internal.analysis.cleanupOldHeatScores, {});

    console.log(
      `[BATCH:${batchId}] Complete - processed: ${processed}, skipped: ${skipped}, failed: ${failed}`,
    );

    return { processed, skipped, failed, markets: analyzedMarkets };
  },
});

export const getPendingQueueItems = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("analysisQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
  },
});

export const getMarketHeatScores = internalQuery({
  args: { marketIds: v.array(v.id("markets")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const marketId of args.marketIds) {
      const heat = await ctx.db
        .query("marketHeat")
        .withIndex("by_market", (q) => q.eq("marketId", marketId))
        .first();
      if (heat) {
        results.push({ marketId, heatScore: heat.heatScore });
      }
    }
    return results;
  },
});

export const markQueueItemProcessing = internalMutation({
  args: { itemId: v.id("analysisQueue"), batchId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      status: "processing",
      batchId: args.batchId,
    });
  },
});

export const markQueueItemCompleted = internalMutation({
  args: {
    itemId: v.id("analysisQueue"),
    status: v.union(v.literal("completed"), v.literal("skipped")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      status: args.status,
      processedAt: Date.now(),
    });
  },
});

export const cleanupOldHeatScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const oldHeat = await ctx.db
      .query("marketHeat")
      .filter((q) => q.lt(q.field("updatedAt"), oneHourAgo))
      .collect();

    for (const heat of oldHeat) {
      await ctx.db.delete(heat._id);
    }

    return { deleted: oldHeat.length };
  },
});
