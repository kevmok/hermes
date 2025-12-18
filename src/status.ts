import { Effect, Ref, Duration } from "effect";
import pl from "nodejs-polars";
import { DataService } from "./data";

export const statusReportingEffect = Effect.gen(function* () {
  const { marketsRef, predictionsRef, consensusRef } = yield* DataService;

  yield* Effect.forever(
    Effect.gen(function* () {
      const markets = yield* Ref.get(marketsRef);
      const predictions = yield* Ref.get(predictionsRef);
      const consensus = yield* Ref.get(consensusRef);

      // Count unanalyzed markets
      let unanalyzedCount = 0;
      if (markets.height > 0) {
        const unanalyzed = markets.filter(pl.col("analyzed").eq(pl.lit(false)));
        unanalyzedCount = unanalyzed.height;
      }

      console.log("\n--- STATUS REPORT ---");
      console.log(`Markets tracked: ${markets.height}`);
      console.log(`Unanalyzed: ${unanalyzedCount}`);
      console.log(`Analyzed: ${markets.height - unanalyzedCount}`);
      console.log(`Predictions: ${predictions.height}`);
      console.log(`Consensus picks: ${consensus.height}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log("-------------------\n");

      yield* Effect.sleep(Duration.seconds(30));
    })
  );
});
