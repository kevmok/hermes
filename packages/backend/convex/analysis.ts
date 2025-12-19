import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

// ============ INTERNAL MUTATIONS ============

export const createAnalysisRun = internalMutation({
  args: {
    triggerType: v.union(
      v.literal('scheduled'),
      v.literal('on_demand'),
      v.literal('system'),
    ),
  },
  handler: async (ctx, args) => {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return await ctx.db.insert('analysisRuns', {
      runId,
      triggerType: args.triggerType,
      status: 'pending',
      marketsAnalyzed: 0,
      startedAt: Date.now(),
    });
  },
});

export const updateAnalysisRun = internalMutation({
  args: {
    runId: v.id('analysisRuns'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
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
    if (args.status === 'completed' || args.status === 'failed') {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.runId, updates);
  },
});

export const saveModelPrediction = internalMutation({
  args: {
    analysisRunId: v.id('analysisRuns'),
    marketId: v.id('markets'),
    modelName: v.string(),
    decision: v.union(v.literal('YES'), v.literal('NO'), v.literal('NO_TRADE')),
    reasoning: v.string(),
    responseTimeMs: v.number(),
    confidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('modelPredictions', {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const saveInsight = internalMutation({
  args: {
    analysisRunId: v.id('analysisRuns'),
    marketId: v.id('markets'),
    consensusDecision: v.union(
      v.literal('YES'),
      v.literal('NO'),
      v.literal('NO_TRADE'),
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
        ? ('high' as const)
        : args.consensusPercentage >= 60
          ? ('medium' as const)
          : ('low' as const);

    const insightId = await ctx.db.insert('insights', {
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
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    return await ctx.db.insert('analysisRequests', {
      marketId: args.marketId,
      status: 'pending',
      requestedAt: Date.now(),
    });
  },
});

export const updateAnalysisRequest = internalMutation({
  args: {
    requestId: v.id('analysisRequests'),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    insightId: v.optional(v.id('insights')),
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
  args: { runId: v.id('analysisRuns') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.runId);
  },
});

export const getRecentAnalysisRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('analysisRuns')
      .withIndex('by_started_at')
      .order('desc')
      .take(args.limit ?? 20);
  },
});

export const getMarketPredictions = query({
  args: {
    marketId: v.id('markets'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('modelPredictions')
      .withIndex('by_market', (q) => q.eq('marketId', args.marketId))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// ============ PUBLIC MUTATIONS ============

export const requestMarketAnalysis = mutation({
  args: { marketId: v.id('markets') },
  handler: async (ctx, args) => {
    // Check for existing recent insight (within 1 hour)
    const recentInsight = await ctx.db
      .query('insights')
      .withIndex('by_market_time', (q) =>
        q
          .eq('marketId', args.marketId)
          .gte('timestamp', Date.now() - 60 * 60 * 1000),
      )
      .first();

    if (recentInsight) {
      return {
        status: 'completed' as const,
        insightId: recentInsight._id,
        cached: true,
      };
    }

    // Check for pending request
    const pendingRequest = await ctx.db
      .query('analysisRequests')
      .withIndex('by_market', (q) => q.eq('marketId', args.marketId))
      .filter((q) =>
        q.or(
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('status'), 'processing'),
        ),
      )
      .first();

    if (pendingRequest) {
      return {
        status: 'pending' as const,
        requestId: pendingRequest._id,
        cached: false,
      };
    }

    // Create new analysis request
    const requestId = await ctx.db.insert('analysisRequests', {
      marketId: args.marketId,
      status: 'pending',
      requestedAt: Date.now(),
    });

    // Schedule the analysis
    await ctx.scheduler.runAfter(0, internal.analysis.executeMarketAnalysis, {
      requestId,
      marketId: args.marketId,
    });

    return {
      status: 'pending' as const,
      requestId,
      cached: false,
    };
  },
});

// ============ INTERNAL ACTIONS ============

export const executeMarketAnalysis = internalAction({
  args: {
    requestId: v.optional(v.id('analysisRequests')),
    marketId: v.id('markets'),
  },
  returns: v.object({
    success: v.boolean(),
    insightId: v.id('insights'),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; insightId: Id<'insights'> }> => {
    // Create analysis run
    const runId: Id<'analysisRuns'> = await ctx.runMutation(
      internal.analysis.createAnalysisRun,
      {
        triggerType: args.requestId ? 'on_demand' : 'system',
      },
    );

    try {
      // Update status to running
      await ctx.runMutation(internal.analysis.updateAnalysisRun, {
        runId,
        status: 'running',
      });

      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: 'processing',
        });
      }

      // Get market data
      const market = await ctx.runQuery(api.markets.getMarket, {
        marketId: args.marketId,
      });

      if (!market) throw new Error('Market not found');

      // Call AI models - this is where you integrate with your existing swarm
      // The actual AI calls happen here (external HTTP calls to AI providers)
      const modelResults = await performAIAnalysis(market);

      // Save individual predictions
      for (const result of modelResults) {
        await ctx.runMutation(internal.analysis.saveModelPrediction, {
          analysisRunId: runId,
          marketId: args.marketId,
          modelName: result.modelName,
          decision: result.decision,
          reasoning: result.reasoning,
          responseTimeMs: result.responseTimeMs,
          confidence: result.confidence,
        });
      }

      // Calculate consensus
      const consensus = calculateConsensus(modelResults);

      // Save insight
      const insightId: Id<'insights'> = await ctx.runMutation(
        internal.analysis.saveInsight,
        {
          analysisRunId: runId,
          marketId: args.marketId,
          consensusDecision: consensus.decision,
          consensusPercentage: consensus.percentage,
          totalModels: modelResults.length,
          agreeingModels: consensus.agreeingCount,
          aggregatedReasoning: consensus.reasoning,
          priceAtAnalysis: market.currentYesPrice,
        },
      );

      // Update analysis run as completed
      await ctx.runMutation(internal.analysis.updateAnalysisRun, {
        runId,
        status: 'completed',
        marketsAnalyzed: 1,
      });

      // Update request if on-demand
      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: 'completed',
          insightId,
        });
      }

      return { success: true, insightId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.analysis.updateAnalysisRun, {
        runId,
        status: 'failed',
        errorMessage,
      });

      if (args.requestId) {
        await ctx.runMutation(internal.analysis.updateAnalysisRequest, {
          requestId: args.requestId,
          status: 'failed',
          errorMessage,
        });
      }

      throw error;
    }
  },
});

// ============ HELPERS ============

interface ModelResult {
  modelName: string;
  decision: 'YES' | 'NO' | 'NO_TRADE';
  reasoning: string;
  responseTimeMs: number;
  confidence?: number;
}

async function performAIAnalysis(_market: {
  title: string;
  currentYesPrice: number;
  eventSlug: string;
}): Promise<ModelResult[]> {
  // TODO: Integrate with existing Effect.ts AI swarm from apps/lofn
  // This would call the AI providers (Anthropic, OpenAI, Google) in parallel
  // For now, this is a placeholder showing the expected structure

  // In production, you would:
  // 1. Import your existing swarm logic or make HTTP calls to AI providers
  // 2. Use environment variables for API keys
  // 3. Implement proper error handling and retries

  throw new Error(
    'AI analysis not yet implemented - integrate with apps/lofn swarm',
  );
}

function calculateConsensus(results: ModelResult[]) {
  const counts = { YES: 0, NO: 0, NO_TRADE: 0 };
  for (const r of results) counts[r.decision]++;

  const total = results.length;
  const tradingResults = results.filter((r) => r.decision !== 'NO_TRADE');

  let decision: 'YES' | 'NO' | 'NO_TRADE' = 'NO_TRADE';
  let agreeingCount = 0;

  if (tradingResults.length > 0) {
    if (counts.YES > counts.NO) {
      decision = 'YES';
      agreeingCount = counts.YES;
    } else if (counts.NO > counts.YES) {
      decision = 'NO';
      agreeingCount = counts.NO;
    }
  }

  const percentage = total > 0 ? (agreeingCount / total) * 100 : 0;

  return {
    decision,
    percentage,
    agreeingCount,
    reasoning: results
      .filter((r) => r.decision === decision)
      .map((r) => `${r.modelName}: ${r.reasoning.slice(0, 200)}`)
      .join(' | '),
  };
}
