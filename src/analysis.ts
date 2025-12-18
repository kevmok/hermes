import { Effect, Ref, Duration } from "effect";
import { LanguageModel } from "@effect/ai";
import pl from "nodejs-polars";
import { CONFIG } from "./config";
import { DataService } from "./data";
import { MARKET_ANALYSIS_SYSTEM_PROMPT, CONSENSUS_AI_PROMPT } from "./prompt";

export const analysisTask = Effect.gen(function* () {
  const data = yield* DataService;
  const { marketsRef } = data;

  const markets = yield* Ref.get(marketsRef);

  // Skip if no markets
  if (markets.height === 0) {
    console.log("No markets to analyze");
    return;
  }

  // Get unanalyzed markets sorted by recent activity
  const unanalyzed = markets
    .filter(pl.col("analyzed").eq(pl.lit(false)))
    .sort("last_trade_timestamp", true);

  const toAnalyze = unanalyzed.head(CONFIG.MARKETS_TO_ANALYZE);

  if (toAnalyze.height < CONFIG.NEW_MARKETS_FOR_ANALYSIS) {
    console.log(`Waiting for markets (${toAnalyze.height}/${CONFIG.NEW_MARKETS_FOR_ANALYSIS})`);
    return;
  }

  console.log(`\nAnalyzing ${toAnalyze.height} markets...`);

  // Build prompt with market information
  const rows = toAnalyze.toRecords();
  const marketLines = rows
    .map((row, i) => {
      const link = `https://polymarket.com/event/${row.event_slug}`;
      return `${i + 1}. ${row.title} [Link](${link})`;
    })
    .join("\n");

  const userPrompt = `Analyze these markets:\n${marketLines}\n\nRespond with JSON array: [{"decision": "YES|NO|NO_TRADE", "reasoning": "..."}]`;

  if (CONFIG.USE_SWARM_MODE) {
    // Get the language model from context
    const model = yield* LanguageModel.LanguageModel;

    // Query the model
    const response = yield* model.generateText({
      prompt: [
        { role: "system", content: MARKET_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }).pipe(
      Effect.timeout(Duration.seconds(120)),
      Effect.catchAll((error) => {
        console.error("Model error:", error);
        return Effect.succeed({ text: "[]", parts: [], usage: { inputTokens: 0, outputTokens: 0 } });
      }),
    );

    console.log(`Model response received`);

    // Build consensus prompt
    const consensusInput = `${CONSENSUS_AI_PROMPT}

Markets analyzed:
${marketLines}

Model response:
${response.text}

Return JSON array with top ${CONFIG.TOP_MARKETS_COUNT} consensus picks with format:
[{"rank": 1, "market_number": 1, "market_title": "...", "side": "YES|NO", "reasoning": "..."}]`;

    const consensusResponse = yield* model.generateText({
      prompt: consensusInput,
    }).pipe(
      Effect.timeout(Duration.seconds(120)),
      Effect.catchAll((error) => {
        console.error("Consensus error:", error);
        return Effect.succeed({ text: "[]", parts: [], usage: { inputTokens: 0, outputTokens: 0 } });
      }),
    );

    console.log("\nTOP CONSENSUS PICKS:");
    console.log(consensusResponse.text);

    // Mark analyzed markets
    const analyzedIds = rows.map((r) => r.market_id);
    yield* Ref.update(marketsRef, (df) => {
      // Update analyzed flag for processed markets
      return df.withColumns(
        pl.when(pl.col("market_id").isIn(analyzedIds))
          .then(pl.lit(true))
          .otherwise(pl.col("analyzed"))
          .alias("analyzed")
      );
    });
  }

  // Save all data
  yield* data.saveAll;
  console.log("Analysis complete, data saved.");
});
