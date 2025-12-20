import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

interface MarketForAnalysis {
  _id: Id<'markets'>;
  polymarketId: string;
  title: string;
  eventSlug: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
}

export const runAutomaticAnalysis = internalAction({
  args: {},
  returns: v.object({
    analyzed: v.number(),
    total: v.optional(v.number()),
    errors: v.optional(v.number()),
  }),
  handler: async (
    ctx,
  ): Promise<{ analyzed: number; total?: number; errors?: number }> => {
    // Get top markets by activity that haven't been analyzed recently
    const markets: MarketForAnalysis[] = await ctx.runQuery(
      api.markets.getMarketsNeedingAnalysis,
      {
        limit: 10,
        minHoursSinceLastAnalysis: 6,
      },
    );

    if (markets.length === 0) {
      console.log('No markets need analysis');
      return { analyzed: 0 };
    }

    // Create batch analysis run
    const runId: Id<'analysisRuns'> = await ctx.runMutation(
      api.analysis.createAnalysisRun,
      {
        triggerType: 'scheduled',
      },
    );

    let analyzed = 0;
    const errors: string[] = [];

    for (const market of markets) {
      try {
        await ctx.runAction(internal.analysis.executeMarketAnalysis, {
          marketId: market._id,
        });
        analyzed++;
      } catch (error) {
        const msg = `Failed to analyze market ${market._id}: ${error}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    await ctx.runMutation(api.analysis.updateAnalysisRun, {
      runId,
      status: errors.length === markets.length ? 'failed' : 'completed',
      marketsAnalyzed: analyzed,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
    });

    console.log(
      `Automatic analysis completed: ${analyzed}/${markets.length} markets`,
    );
    return { analyzed, total: markets.length, errors: errors.length };
  },
});

export const cleanupOldData = internalMutation({
  args: {},
  returns: v.object({
    snapshots: v.number(),
    predictions: v.number(),
    requests: v.number(),
  }),
  handler: async (
    ctx,
  ): Promise<{ snapshots: number; predictions: number; requests: number }> => {
    const snapshotCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const predictionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

    // Delete old market snapshots (keep 7 days)
    const oldSnapshots = await ctx.db
      .query('marketSnapshots')
      .withIndex('by_timestamp')
      .filter((q) => q.lt(q.field('timestamp'), snapshotCutoff))
      .take(1000);

    for (const snapshot of oldSnapshots) {
      await ctx.db.delete(snapshot._id);
    }

    // Delete old model predictions (keep 30 days)
    const oldPredictions = await ctx.db
      .query('modelPredictions')
      .withIndex('by_timestamp')
      .filter((q) => q.lt(q.field('timestamp'), predictionCutoff))
      .take(1000);

    for (const prediction of oldPredictions) {
      await ctx.db.delete(prediction._id);
    }

    // Delete completed/failed analysis requests older than 7 days
    const oldRequests = await ctx.db
      .query('analysisRequests')
      .withIndex('by_requested_at')
      .filter((q) =>
        q.and(
          q.lt(q.field('requestedAt'), snapshotCutoff),
          q.or(
            q.eq(q.field('status'), 'completed'),
            q.eq(q.field('status'), 'failed'),
          ),
        ),
      )
      .take(1000);

    for (const request of oldRequests) {
      await ctx.db.delete(request._id);
    }

    console.log(
      `Cleaned up: ${oldSnapshots.length} snapshots, ${oldPredictions.length} predictions, ${oldRequests.length} requests`,
    );

    return {
      snapshots: oldSnapshots.length,
      predictions: oldPredictions.length,
      requests: oldRequests.length,
    };
  },
});
