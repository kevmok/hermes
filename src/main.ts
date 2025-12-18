import { Effect, Schedule, Layer, Duration } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import { CONFIG } from "./config";
import { analysisTask } from "./analysis";
import { websocketEffect } from "./websocket";
import { statusReportingEffect } from "./status";
import { PrimaryModelLayer } from "./models";
import { DataService, DataLayer } from "./data";

const program = Effect.gen(function* () {
  const data = yield* DataService;

  // Load existing data
  yield* data.loadData;

  console.log("Starting Polymarket Agent...");
  console.log(`Analysis interval: ${CONFIG.ANALYSIS_CHECK_INTERVAL_SECONDS}s`);
  console.log(`Min trade size: $${CONFIG.MIN_TRADE_SIZE_USD}`);
  console.log(`Markets to analyze: ${CONFIG.MARKETS_TO_ANALYZE}`);

  // Start WebSocket (runs forever with reconnects)
  yield* websocketEffect.pipe(Effect.fork);

  // Start status reporting (every 30 seconds)
  yield* statusReportingEffect.pipe(Effect.fork);

  // Periodic analysis
  yield* analysisTask.pipe(
    Effect.repeat(
      Schedule.spaced(Duration.seconds(CONFIG.ANALYSIS_CHECK_INTERVAL_SECONDS))
    ),
    Effect.fork
  );

  // Graceful shutdown handler
  yield* Effect.async<void, never>(() => {
    const shutdown = async () => {
      console.log("\nShutting down gracefully...");

      // Save data before exit
      Effect.runPromise(data.saveAll)
        .then(() => {
          console.log("Data saved. Goodbye!");
          process.exit(0);
        })
        .catch((e) => {
          console.error("Failed to save data:", e);
          process.exit(1);
        });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

  // Keep process alive
  yield* Effect.never;
});

// Compose layers
const AppLayer = Layer.provideMerge(PrimaryModelLayer, DataLayer);

// Run program with BunRuntime
BunRuntime.runMain(
  program.pipe(
    Effect.provide(AppLayer),
    Effect.catchAllDefect((defect) => {
      console.error("Unhandled defect:", defect);
      return Effect.die(defect);
    })
  )
);
