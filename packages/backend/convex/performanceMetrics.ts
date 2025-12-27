import { v } from 'convex/values';
import { query } from './_generated/server';

// ============ CORE METRICS QUERY ============

export const getPerformanceStats = query({
  args: {
    sinceDays: v.optional(v.number()), // Filter signals from last N days
  },
  handler: async (ctx, args) => {
    const sinceMs = args.sinceDays
      ? Date.now() - args.sinceDays * 24 * 60 * 60 * 1000
      : 0;

    // Get all signals (optionally filtered by time)
    let signalsQuery = ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc');

    const allSignals =
      sinceMs > 0
        ? await signalsQuery
            .filter((q) => q.gte(q.field('signalTimestamp'), sinceMs))
            .collect()
        : await signalsQuery.collect();

    // Get all resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();

    // Create lookup map for resolved markets
    const resolvedMap = new Map<string, 'YES' | 'NO' | 'INVALID' | null>();
    for (const market of resolvedMarkets) {
      resolvedMap.set(market._id, market.outcome ?? null);
    }

    // Calculate metrics
    const totalSignals = allSignals.length;
    let signalsOnResolved = 0;
    let correctPredictions = 0;
    let incorrectPredictions = 0;
    let yesSignals = 0;
    let noSignals = 0;
    let noTradeSignals = 0;
    let highConfidenceSignals = 0;
    let highConfidenceCorrect = 0;
    let highConfidenceEvaluated = 0;
    let totalConsensusOnWins = 0;

    // Time-based counts
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let signalsLast24h = 0;
    let signalsLast7d = 0;

    for (const signal of allSignals) {
      // Count by decision type
      if (signal.consensusDecision === 'YES') yesSignals++;
      else if (signal.consensusDecision === 'NO') noSignals++;
      else noTradeSignals++;

      // High confidence tracking
      if (signal.isHighConfidence) {
        highConfidenceSignals++;
      }

      // Time-based counts
      if (signal.signalTimestamp >= oneDayAgo) signalsLast24h++;
      if (signal.signalTimestamp >= sevenDaysAgo) signalsLast7d++;

      // Check against resolved outcome
      const outcome = resolvedMap.get(signal.marketId);
      if (outcome !== undefined && outcome !== null && outcome !== 'INVALID') {
        signalsOnResolved++;

        // Skip NO_TRADE for accuracy calculation
        if (signal.consensusDecision === 'NO_TRADE') continue;

        const isCorrect = signal.consensusDecision === outcome;

        if (signal.isHighConfidence) {
          highConfidenceEvaluated++;
        }

        if (isCorrect) {
          correctPredictions++;
          totalConsensusOnWins += signal.consensusPercentage;
          if (signal.isHighConfidence) highConfidenceCorrect++;
        } else {
          incorrectPredictions++;
        }
      }
    }

    // Calculate rates
    const predictionsEvaluated = correctPredictions + incorrectPredictions;
    const winRate =
      predictionsEvaluated > 0
        ? (correctPredictions / predictionsEvaluated) * 100
        : 0;

    const highConfidenceWinRate =
      highConfidenceEvaluated > 0
        ? (highConfidenceCorrect / highConfidenceEvaluated) * 100
        : 0;

    const avgConsensusOnWins =
      correctPredictions > 0 ? totalConsensusOnWins / correctPredictions : 0;

    // Calculate simulated ROI (assuming $100 flat bet per signal)
    // Simple model: win pays 1:1, lose pays -1
    const simulatedROI =
      predictionsEvaluated > 0
        ? ((correctPredictions - incorrectPredictions) / predictionsEvaluated) *
          100
        : 0;

    return {
      // Totals
      totalSignals,
      signalsOnResolved,
      predictionsEvaluated,

      // Accuracy
      correctPredictions,
      incorrectPredictions,
      winRate: Math.round(winRate * 10) / 10,
      highConfidenceWinRate: Math.round(highConfidenceWinRate * 10) / 10,
      avgConsensusOnWins: Math.round(avgConsensusOnWins * 10) / 10,

      // ROI
      simulatedROI: Math.round(simulatedROI * 10) / 10,

      // Breakdown
      yesSignals,
      noSignals,
      noTradeSignals,
      highConfidenceSignals,

      // Recent activity
      signalsLast24h,
      signalsLast7d,
    };
  },
});

// ============ SIGNAL ACCURACY BREAKDOWN ============

export const getSignalAccuracyByDecision = query({
  args: {},
  handler: async (ctx) => {
    // Get all signals
    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .collect();

    // Get resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();

    const resolvedMap = new Map<string, 'YES' | 'NO' | 'INVALID' | null>();
    for (const market of resolvedMarkets) {
      resolvedMap.set(market._id, market.outcome ?? null);
    }

    const breakdown = {
      YES: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
      NO: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
      NO_TRADE: { total: 0, evaluated: 0, correct: 0, winRate: 0 },
    };

    for (const signal of signals) {
      const decision = signal.consensusDecision;
      breakdown[decision].total++;

      const outcome = resolvedMap.get(signal.marketId);
      // Only evaluate against YES/NO outcomes (skip INVALID)
      if (outcome === 'YES' || outcome === 'NO') {
        breakdown[decision].evaluated++;
        if (decision === outcome) {
          breakdown[decision].correct++;
        }
      }
    }

    // Calculate win rates
    for (const key of ['YES', 'NO'] as const) {
      breakdown[key].winRate =
        breakdown[key].evaluated > 0
          ? Math.round(
              (breakdown[key].correct / breakdown[key].evaluated) * 1000,
            ) / 10
          : 0;
    }

    return breakdown;
  },
});

// ============ SIGNALS WITH OUTCOMES ============

export const getSignalsWithOutcomes = query({
  args: {
    limit: v.optional(v.number()),
    onlyEvaluated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit * 2); // Fetch extra to filter

    const results = await Promise.all(
      signals.map(async (signal) => {
        const market = await ctx.db.get(signal.marketId);

        const outcome = market?.outcome ?? null;
        // Only mark as correct/incorrect for YES/NO outcomes
        const isCorrect =
          outcome === 'YES' || outcome === 'NO'
            ? signal.consensusDecision !== 'NO_TRADE'
              ? signal.consensusDecision === outcome
              : null
            : null;

        return {
          ...signal,
          market: market
            ? {
                _id: market._id,
                title: market.title,
                eventSlug: market.eventSlug,
                outcome: market.outcome,
                resolvedAt: market.resolvedAt,
              }
            : null,
          outcome,
          isCorrect,
        };
      }),
    );

    if (args.onlyEvaluated) {
      return results.filter((r) => r.isCorrect !== null).slice(0, limit);
    }

    return results.slice(0, limit);
  },
});

// ============ DAILY STATS HISTORY ============

export const getDailySignalStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30;
    const now = Date.now();
    const startMs = now - days * 24 * 60 * 60 * 1000;

    const signals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .filter((q) => q.gte(q.field('signalTimestamp'), startMs))
      .collect();

    // Group by day
    const dailyStats = new Map<
      string,
      {
        count: number;
        highConfidence: number;
        yesDecisions: number;
        noDecisions: number;
      }
    >();

    for (const signal of signals) {
      const dateParts = new Date(signal.signalTimestamp)
        .toISOString()
        .split('T');
      const date = dateParts[0] ?? 'unknown';

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          count: 0,
          highConfidence: 0,
          yesDecisions: 0,
          noDecisions: 0,
        });
      }

      const stats = dailyStats.get(date)!;
      stats.count++;
      if (signal.isHighConfidence) stats.highConfidence++;
      if (signal.consensusDecision === 'YES') stats.yesDecisions++;
      if (signal.consensusDecision === 'NO') stats.noDecisions++;
    }

    // Convert to sorted array
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// ============ CONFIDENCE CALIBRATION ============

export const getConfidenceCalibration = query({
  args: {},
  handler: async (ctx) => {
    const signals = await ctx.db.query('signals').collect();

    // Get resolved markets
    const resolvedMarkets = await ctx.db
      .query('markets')
      .withIndex('by_resolved')
      .filter((q) => q.neq(q.field('outcome'), undefined))
      .collect();

    const resolvedMap = new Map<string, 'YES' | 'NO' | 'INVALID' | null>();
    for (const market of resolvedMarkets) {
      resolvedMap.set(market._id, market.outcome ?? null);
    }

    // Group signals by confidence bracket
    const brackets = [
      { min: 90, max: 100, label: '90-100%', correct: 0, total: 0 },
      { min: 80, max: 89, label: '80-89%', correct: 0, total: 0 },
      { min: 70, max: 79, label: '70-79%', correct: 0, total: 0 },
      { min: 60, max: 69, label: '60-69%', correct: 0, total: 0 },
      { min: 50, max: 59, label: '50-59%', correct: 0, total: 0 },
    ];

    for (const signal of signals) {
      // Skip NO_TRADE signals
      if (signal.consensusDecision === 'NO_TRADE') continue;

      const outcome = resolvedMap.get(signal.marketId);
      // Only count YES/NO outcomes
      if (outcome !== 'YES' && outcome !== 'NO') continue;

      const bracket = brackets.find(
        (b) =>
          signal.consensusPercentage >= b.min &&
          signal.consensusPercentage <= b.max,
      );

      if (bracket) {
        bracket.total++;
        if (signal.consensusDecision === outcome) {
          bracket.correct++;
        }
      }
    }

    return brackets.map((b) => ({
      ...b,
      actualAccuracy:
        b.total > 0 ? Math.round((b.correct / b.total) * 1000) / 10 : 0,
    }));
  },
});
