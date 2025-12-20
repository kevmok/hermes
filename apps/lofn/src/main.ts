import { Effect, Schedule, Layer, Duration } from 'effect';
import { BunRuntime } from '@effect/platform-bun';
import { FetchHttpClient } from '@effect/platform';
import { CONFIG } from './config';
import {
  DataService,
  DataLayer,
  websocketEffect,
  fetchHistoricalTrades,
} from './services';
import { ConvexDataLayer } from './services/data/ConvexDataService';

const program = Effect.gen(function* () {
  const data = yield* DataService;

  // Load existing data
  yield* data.loadData;

  console.log('Starting Polymarket Collector...');
  console.log(`Min trade size: $${CONFIG.MIN_TRADE_SIZE_USD}`);
  console.log('Analysis now handled by Convex backend');

  // Fetch historical trades before starting WebSocket
  yield* fetchHistoricalTrades;

  // Start WebSocket (runs forever with reconnects)
  // This collects trades and sends them to Convex for analysis
  yield* websocketEffect.pipe(Effect.fork);

  // Periodic data save (every 5 minutes)
  yield* data.saveAll.pipe(
    Effect.repeat(Schedule.spaced(Duration.minutes(5))),
    Effect.fork,
  );

  // Prune old data periodically (every hour)
  yield* data.pruneOldData.pipe(
    Effect.repeat(Schedule.spaced(Duration.hours(1))),
    Effect.fork,
  );

  // Graceful shutdown handler
  yield* Effect.async<void, never>(() => {
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');

      // Save data before exit
      Effect.runPromise(data.saveAll)
        .then(() => {
          console.log('Data saved. Goodbye!');
          process.exit(0);
        })
        .catch((e) => {
          console.error('Failed to save data:', e);
          process.exit(1);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

  // Keep process alive
  yield* Effect.never;
});

// Compose layers:
// - DataLayer: local CSV storage (backup)
// - ConvexDataLayer: Convex backend (primary) - triggers AI analysis
// - FetchHttpClient: for API calls
const AppLayer = Layer.provideMerge(
  ConvexDataLayer,
  Layer.provideMerge(DataLayer, FetchHttpClient.layer),
);

// Run program with BunRuntime
BunRuntime.runMain(
  program.pipe(
    Effect.provide(AppLayer),
    Effect.catchAllDefect((defect) => {
      console.error('Unhandled defect:', defect);
      return Effect.die(defect);
    }),
  ),
);
