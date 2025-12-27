import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server';

// Scheduled analysis is deprecated - analysis now happens on trade events
// Markets no longer store volatile price data, so scheduled analysis cannot
// determine prices without fetching from API. Trade-triggered analysis uses
// the price from the trade context.
export const runAutomaticAnalysis = internalAction({
  args: {},
  returns: v.object({
    analyzed: v.number(),
    total: v.optional(v.number()),
    errors: v.optional(v.number()),
    skipped: v.optional(v.boolean()),
  }),
  handler: async (): Promise<{
    analyzed: number;
    total?: number;
    errors?: number;
    skipped?: boolean;
  }> => {
    // Scheduled analysis is deprecated - prices are no longer stored in DB
    // Analysis now triggers automatically when whale trades come in
    console.log(
      'Scheduled analysis skipped - analysis now happens on trade events',
    );
    return { analyzed: 0, skipped: true };
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
