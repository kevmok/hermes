import { Effect, Ref } from 'effect';
import pl from 'nodejs-polars';
import { CONFIG } from '../../config';
import { DataService } from '../data';
import { SwarmService, type SwarmResponse } from '../ai';
import { MARKET_ANALYSIS_SYSTEM_PROMPT } from '../ai';

// Generate unique run ID
const generateRunId = () =>
  `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Save individual model predictions to predictions DataFrame
const savePredictions = (
  predictionsRef: Ref.Ref<pl.DataFrame>,
  runId: string,
  market: Record<string, unknown>,
  swarmResponse: SwarmResponse,
) =>
  Effect.gen(function* () {
    const now = new Date().toISOString();

    // Create rows for each model's prediction
    const newRows = swarmResponse.results.map((result) => ({
      run_id: runId,
      timestamp: now,
      market_id: market.market_id as string,
      event_slug: market.event_slug as string,
      title: market.title as string,
      outcome: market.outcome as string,
      price: market.price as number,
      model_name: result.modelName,
      decision: result.decision,
      reasoning: result.reasoning,
      response_time_ms: result.responseTimeMs,
      consensus_decision: swarmResponse.consensusDecision,
      consensus_percentage: swarmResponse.consensusPercentage,
    }));

    if (newRows.length === 0) return;

    yield* Ref.update(predictionsRef, (df) => {
      const newDf = pl.DataFrame({
        run_id: newRows.map((r) => r.run_id),
        timestamp: newRows.map((r) => r.timestamp),
        market_id: newRows.map((r) => r.market_id),
        event_slug: newRows.map((r) => r.event_slug),
        title: newRows.map((r) => r.title),
        outcome: newRows.map((r) => r.outcome),
        price: newRows.map((r) => r.price),
        model_name: newRows.map((r) => r.model_name),
        decision: newRows.map((r) => r.decision),
        reasoning: newRows.map((r) => r.reasoning),
        response_time_ms: newRows.map((r) => r.response_time_ms),
        consensus_decision: newRows.map((r) => r.consensus_decision),
        consensus_percentage: newRows.map((r) => r.consensus_percentage),
      });

      return df.height > 0 ? pl.concat([df, newDf]) : newDf;
    });
  });

// Save consensus picks for high-confidence markets
const saveConsensusPicks = (
  consensusRef: Ref.Ref<pl.DataFrame>,
  runId: string,
  markets: Array<{
    market: Record<string, unknown>;
    response: SwarmResponse;
    rank: number;
  }>,
) =>
  Effect.gen(function* () {
    const now = new Date().toISOString();

    // Filter to high-confidence picks (>= 66% consensus)
    const highConfidencePicks = markets
      .filter((m) => m.response.consensusPercentage >= 66)
      .sort(
        (a, b) =>
          b.response.consensusPercentage - a.response.consensusPercentage,
      )
      .slice(0, CONFIG.TOP_MARKETS_COUNT);

    if (highConfidencePicks.length === 0) return;

    const newRows = highConfidencePicks.map((pick, idx) => ({
      timestamp: now,
      run_id: runId,
      rank: idx + 1,
      market_number: pick.rank,
      market_title: pick.market.title as string,
      side: pick.response.consensusDecision,
      consensus: `${pick.response.successfulModels} out of ${pick.response.totalModels} models agreed`,
      consensus_count: pick.response.successfulModels,
      total_models: pick.response.totalModels,
      link: `https://polymarket.com/event/${pick.market.event_slug}`,
      reasoning: pick.response.results
        .filter((r) => r.decision === pick.response.consensusDecision)
        .map((r) => `${r.modelName}: ${r.reasoning.slice(0, 100)}`)
        .join(' | '),
    }));

    yield* Ref.update(consensusRef, (df) => {
      const newDf = pl.DataFrame({
        timestamp: newRows.map((r) => r.timestamp),
        run_id: newRows.map((r) => r.run_id),
        rank: newRows.map((r) => r.rank),
        market_number: newRows.map((r) => r.market_number),
        market_title: newRows.map((r) => r.market_title),
        side: newRows.map((r) => r.side),
        consensus: newRows.map((r) => r.consensus),
        consensus_count: newRows.map((r) => r.consensus_count),
        total_models: newRows.map((r) => r.total_models),
        link: newRows.map((r) => r.link),
        reasoning: newRows.map((r) => r.reasoning),
      });

      return df.height > 0 ? pl.concat([df, newDf]) : newDf;
    });
  });

export const analysisTask = Effect.gen(function* () {
  const data = yield* DataService;
  const { marketsRef, predictionsRef, consensusRef } = data;

  const markets = yield* Ref.get(marketsRef);

  // Skip if no markets
  if (markets.height === 0) {
    console.log('No markets to analyze');
    return;
  }

  // Get unanalyzed markets sorted by recent activity
  const unanalyzed = markets
    .filter(pl.col('analyzed').eq(pl.lit(false)))
    .sort('last_trade_timestamp', true);

  const toAnalyze = unanalyzed.head(CONFIG.MARKETS_TO_ANALYZE);

  if (toAnalyze.height < CONFIG.NEW_MARKETS_FOR_ANALYSIS) {
    console.log(
      `Waiting for markets (${toAnalyze.height}/${CONFIG.NEW_MARKETS_FOR_ANALYSIS})`,
    );
    return;
  }

  console.log(`\nAnalyzing ${toAnalyze.height} markets...`);

  const runId = generateRunId();
  const rows = toAnalyze.toRecords();

  if (CONFIG.USE_SWARM_MODE) {
    const swarm = yield* SwarmService;
    const marketResults: Array<{
      market: Record<string, unknown>;
      response: SwarmResponse;
      rank: number;
    }> = [];

    // Analyze each market with the swarm
    for (let i = 0; i < rows.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: just checking for null
      const market = rows[i]!;
      const link = `https://polymarket.com/event/${market.event_slug}`;

      const userPrompt = `Analyze this prediction market:

Title: ${market.title}
Current Price: ${market.price}
Outcome: ${market.outcome}
Link: ${link}

Should I trade YES, NO, or NO_TRADE on this market?

Respond with JSON: {"decision": "YES|NO|NO_TRADE", "reasoning": "your analysis"}`;

      console.log(
        `\n[${i + 1}/${rows.length}] ${(market.title as string).slice(0, 60)}...`,
      );

      const response = yield* swarm.query(
        MARKET_ANALYSIS_SYSTEM_PROMPT,
        userPrompt,
      );

      console.log(
        `  Consensus: ${response.consensusDecision} (${response.consensusPercentage.toFixed(0)}% of ${response.successfulModels}/${response.totalModels} models)`,
      );

      // Save individual predictions
      yield* savePredictions(predictionsRef, runId, market, response);

      marketResults.push({
        market,
        response,
        rank: i + 1,
      });
    }

    // Save high-confidence consensus picks
    yield* saveConsensusPicks(consensusRef, runId, marketResults);

    // Print summary
    console.log('\n=== ANALYSIS SUMMARY ===');
    for (const result of marketResults) {
      const { market, response } = result;
      const confidence =
        response.consensusPercentage >= 66
          ? 'HIGH'
          : response.consensusPercentage >= 50
            ? 'MEDIUM'
            : 'LOW';
      console.log(
        `${response.consensusDecision} [${confidence}] ${(market.title as string).slice(0, 50)}...`,
      );
    }

    // Mark analyzed markets
    const analyzedIds = rows.map((r) => r.market_id);
    yield* Ref.update(marketsRef, (df) => {
      return df.withColumns(
        pl
          .when(pl.col('market_id').isIn(analyzedIds))
          .then(pl.lit(true))
          .otherwise(pl.col('analyzed'))
          .alias('analyzed'),
      );
    });
  }

  // Save all data
  yield* data.saveAll;
  console.log('Analysis complete, data saved.');
});
