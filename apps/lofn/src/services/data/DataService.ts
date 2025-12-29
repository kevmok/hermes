import * as fs from 'node:fs/promises';
import { Context, Effect, Layer, Ref } from 'effect';
import pl from 'nodejs-polars';
import { CONFIG } from '../../config';

// Create an empty DataFrame with expected schema
const createEmptyMarketsDF = () =>
  pl.DataFrame({
    market_id: [] as string[],
    event_slug: [] as string[],
    title: [] as string[],
    outcome: [] as string[],
    price: [] as number[],
    size_usd: [] as number[],
    timestamp: [] as string[],
    first_seen: [] as string[],
    last_trade_timestamp: [] as string[],
    analyzed: [] as boolean[],
  });

const createEmptyPredictionsDF = () =>
  pl.DataFrame({
    run_id: [] as string[],
    timestamp: [] as string[],
    market_id: [] as string[],
    event_slug: [] as string[],
    title: [] as string[],
    outcome: [] as string[],
    price: [] as number[],
    model_name: [] as string[],
    decision: [] as string[],
    reasoning: [] as string[],
    response_time_ms: [] as number[],
    consensus_decision: [] as string[],
    consensus_percentage: [] as number[],
  });

const createEmptyConsensusDF = () =>
  pl.DataFrame({
    timestamp: [] as string[],
    run_id: [] as string[],
    rank: [] as number[],
    market_number: [] as number[],
    market_title: [] as string[],
    side: [] as string[],
    consensus: [] as string[],
    consensus_count: [] as number[],
    total_models: [] as number[],
    link: [] as string[],
    reasoning: [] as string[],
  });

export class DataService extends Context.Tag('DataService')<
  DataService,
  {
    readonly marketsRef: Ref.Ref<pl.DataFrame>;
    readonly predictionsRef: Ref.Ref<pl.DataFrame>;
    readonly consensusRef: Ref.Ref<pl.DataFrame>;

    readonly loadData: Effect.Effect<void, unknown>;
    readonly saveAll: Effect.Effect<void, unknown>;
    readonly pruneOldData: Effect.Effect<void, unknown>;
  }
>() {}

const make = Effect.gen(function* () {
  const marketsRef = yield* Ref.make(createEmptyMarketsDF());
  const predictionsRef = yield* Ref.make(createEmptyPredictionsDF());
  const consensusRef = yield* Ref.make(createEmptyConsensusDF());

  const loadData = Effect.gen(function* () {
    // Create data folder if it doesn't exist
    yield* Effect.tryPromise(() =>
      fs.mkdir(CONFIG.DATA_FOLDER, { recursive: true }),
    );

    // Load markets.csv if exists
    const marketsPath = `${CONFIG.DATA_FOLDER}/markets.csv`;
    const marketsExists = yield* Effect.tryPromise(() =>
      fs
        .access(marketsPath)
        .then(() => true)
        .catch(() => false),
    );

    if (marketsExists) {
      yield* Effect.try(() => {
        const df = pl.readCSV(marketsPath);
        return Ref.set(marketsRef, df);
      }).pipe(
        Effect.flatMap((effect) => effect),
        Effect.catchAll(() => Effect.void),
      );
    }

    // Load predictions.csv if exists
    const predictionsPath = `${CONFIG.DATA_FOLDER}/predictions.csv`;
    const predictionsExists = yield* Effect.tryPromise(() =>
      fs
        .access(predictionsPath)
        .then(() => true)
        .catch(() => false),
    );

    if (predictionsExists) {
      yield* Effect.try(() => {
        const df = pl.readCSV(predictionsPath);
        return Ref.set(predictionsRef, df);
      }).pipe(
        Effect.flatMap((effect) => effect),
        Effect.catchAll(() => Effect.void),
      );
    }

    // Load consensus_picks.csv if exists
    const consensusPath = `${CONFIG.DATA_FOLDER}/consensus_picks.csv`;
    const consensusExists = yield* Effect.tryPromise(() =>
      fs
        .access(consensusPath)
        .then(() => true)
        .catch(() => false),
    );

    if (consensusExists) {
      yield* Effect.try(() => {
        const df = pl.readCSV(consensusPath);
        return Ref.set(consensusRef, df);
      }).pipe(
        Effect.flatMap((effect) => effect),
        Effect.catchAll(() => Effect.void),
      );
    }

    console.log('Data loaded successfully');
  });

  const saveAll = Effect.gen(function* () {
    const [markets, predictions, consensus] = yield* Effect.all([
      Ref.get(marketsRef),
      Ref.get(predictionsRef),
      Ref.get(consensusRef),
    ]);

    // Ensure data folder exists
    yield* Effect.tryPromise(() =>
      fs.mkdir(CONFIG.DATA_FOLDER, { recursive: true }),
    );

    // Atomic write pattern: write to temp, then rename
    const writeAtomic = (path: string, df: pl.DataFrame) =>
      Effect.gen(function* () {
        if (df.height === 0) return; // Skip empty DataFrames

        const tempPath = `${path}.tmp`;
        const csvBuffer = df.writeCSV();

        yield* Effect.tryPromise(() => Bun.write(tempPath, csvBuffer));
        yield* Effect.tryPromise(() => fs.rename(tempPath, path));
      });

    yield* Effect.all(
      [
        writeAtomic(`${CONFIG.DATA_FOLDER}/markets.csv`, markets),
        writeAtomic(`${CONFIG.DATA_FOLDER}/predictions.csv`, predictions),
        writeAtomic(`${CONFIG.DATA_FOLDER}/consensus_picks.csv`, consensus),
      ],
      { concurrency: 'unbounded' },
    );

    console.log('Data saved successfully');
  });

  // Prune old data to prevent unbounded memory growth
  const pruneOldData = Effect.gen(function* () {
    const PREDICTIONS_RETENTION_DAYS = 30;
    const CONSENSUS_RETENTION_DAYS = 30;
    const MARKETS_RETENTION_DAYS = 7;

    const predictionsCutoff = new Date(
      Date.now() - PREDICTIONS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const consensusCutoff = new Date(
      Date.now() - CONSENSUS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const marketsCutoff = new Date(
      Date.now() - MARKETS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Prune predictions older than retention period
    yield* Ref.update(predictionsRef, (df) => {
      if (df.height === 0) return df;
      return df.filter(pl.col('timestamp').gt(pl.lit(predictionsCutoff)));
    });

    // Prune consensus older than retention period
    yield* Ref.update(consensusRef, (df) => {
      if (df.height === 0) return df;
      return df.filter(pl.col('timestamp').gt(pl.lit(consensusCutoff)));
    });

    // Remove analyzed markets older than retention period (keep unanalyzed)
    yield* Ref.update(marketsRef, (df) => {
      if (df.height === 0) return df;
      return df.filter(
        pl
          .col('analyzed')
          .eq(pl.lit(false))
          .or(pl.col('last_trade_timestamp').gt(pl.lit(marketsCutoff))),
      );
    });

    console.log('Old data pruned successfully');
  });

  return {
    marketsRef,
    predictionsRef,
    consensusRef,
    loadData,
    saveAll,
    pruneOldData,
  } as const;
});

export const DataLayer = Layer.effect(DataService, make);
