import { Context, Effect, Queue, Schema, type Ref } from "effect";
import type pl from "nodejs-polars";
import { CONFIG, getTierForTradeSize } from "../../config";
import { DataService } from "../data";
import {
  ConvexDataService,
  type MarketDataWithTier,
  type RawTradeData,
} from "../data/ConvexDataService";
import {
  buildMarketRow,
  shouldIncludeTradeWithAI,
  type TradeData,
  updateMarketsRef,
  TradeMessageSchema,
  type TradeMessage,
} from "../../domain";

export const websocketEffect = Effect.gen(function* () {
  const { marketsRef } = yield* DataService;
  const convex = yield* ConvexDataService;

  // Create a bounded queue for incoming messages (backpressure protection)
  const messageQueue = yield* Queue.bounded<TradeMessage>(1000);

  // Message processor fiber - runs continuously
  yield* Effect.fork(
    Effect.forever(
      Effect.gen(function* () {
        const msg = yield* Queue.take(messageQueue);
        yield* processTradeMessage(msg, marketsRef, convex);
      }),
    ),
  );

  // WebSocket connection with reconnect logic
  yield* Effect.async<void, never>(() => {
    const connect = () => {
      console.log("Connecting to Polymarket WebSocket...");
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);

      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            action: "subscribe",
            subscriptions: [
              {
                topic: "activity",
                type: "orders_matched",
              },
            ],
          }),
        );
        console.log("WebSocket connected & subscribed");
      });

      ws.addEventListener("message", (event) => {
        try {
          if (!event.data) return;
          const parsed = JSON.parse(event.data);
          // Validate message against schema
          const result = Schema.decodeUnknownEither(TradeMessageSchema)(parsed);
          if (result._tag === "Left") {
            // Skip invalid messages silently (many are heartbeats/subscriptions)
            return;
          }
          // Non-blocking offer to queue
          Effect.runSync(Queue.offer(messageQueue, result.right));
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      });

      ws.addEventListener("close", () => {
        console.log("WebSocket closed, reconnecting in 3s...");
        setTimeout(connect, 3000);
      });

      ws.addEventListener("error", (e) => {
        console.error("WebSocket error:", e);
      });
    };

    connect();
    // Never resume - runs forever with reconnects
  });
});

const processTradeMessage = (
  data: TradeMessage,
  marketsRef: Ref.Ref<pl.DataFrame>,
  convex: Context.Tag.Service<typeof ConvexDataService>,
) =>
  Effect.gen(function* () {
    // Skip non-trade messages
    if (data.type !== "orders_matched" || !data.payload) return;

    const t = data.payload;

    // Validate required fields
    if (!t.conditionId || !t.title || !t.size || !t.price || !t.outcome) return;

    // Per design decisions: size is already in USD from Polymarket
    // DO NOT multiply by price - that was a bug
    const sizeUsd = t.size;

    const tradeData: TradeData = {
      marketId: t.conditionId,
      eventSlug: t.eventSlug ?? "",
      title: t.title,
      outcome: t.outcome.toUpperCase(),
      price: t.price,
      sizeUsd,
    };

    // Use AI-powered filter (keyword + emotional market detection)
    const filterResult = yield* shouldIncludeTradeWithAI(tradeData);
    if (!filterResult.include) return;

    // 1. Update local CSV (backup)
    const row = buildMarketRow(tradeData);
    yield* updateMarketsRef(marketsRef, row);

    // 2. Determine trade side and tier for signal context
    const tradeSide = t.outcome.toUpperCase() === "YES" ? "YES" : "NO";
    const tier = getTierForTradeSize(sizeUsd);

    if (!tier) {
      console.log(
        `Trade: ${row.title.slice(0, 40)}... | $${sizeUsd.toFixed(0)} - below tier threshold, skipping`,
      );
      return;
    }

    // 3. Build market data with tier for tiered analysis
    const marketDataWithTier: MarketDataWithTier = {
      polymarketId: t.conditionId,
      conditionId: t.conditionId,
      slug: t.slug ?? t.conditionId,
      eventSlug: t.eventSlug ?? "",
      title: t.title,
      isActive: true,
      tradeContext: {
        size: sizeUsd,
        price: t.price,
        side: tradeSide as "YES" | "NO",
        taker: t.proxyWallet,
        timestamp: Date.now(),
      },
      tier,
    };

    // 4. Build raw trade data for the trades table
    const rawTrade: RawTradeData = {
      conditionId: t.conditionId,
      slug: t.slug ?? "",
      eventSlug: t.eventSlug ?? "",
      title: t.title,
      side: (t.side?.toUpperCase() === "BUY" ? "BUY" : "SELL") as
        | "BUY"
        | "SELL",
      size: sizeUsd,
      price: t.price,
      timestamp: t.timestamp ?? Math.floor(Date.now() / 1000),
      proxyWallet: t.proxyWallet ?? "",
      outcome: t.outcome,
      outcomeIndex: t.outcomeIndex ?? 0,
      transactionHash: t.transactionHash,
      isWhale: true,
      traderName: t.name,
      traderPseudonym: t.pseudonym,
    };

    // 5. Send to Convex in parallel: tier-aware market upsert + raw trade storage
    const results = yield* Effect.all(
      [
        convex.upsertMarketWithTier(marketDataWithTier).pipe(
          Effect.catchAll((error) => {
            console.error("Convex market upsert failed:", error);
            return Effect.succeed(undefined);
          }),
        ),
        convex.recordTrade(rawTrade).pipe(
          Effect.catchAll((error) => {
            console.error("Convex trade record failed:", error);
            return Effect.succeed(undefined);
          }),
        ),
      ],
      { concurrency: 2 },
    );

    const tierResult = results[0];
    const tierLabel = tier.toUpperCase();
    const actionLabel = tierResult?.action ?? "unknown";

    console.log(
      `[${tierLabel}] $${sizeUsd.toLocaleString()} ${tradeSide} | ${row.title.slice(0, 40)}... → ${actionLabel}`,
    );

    // 6. Smart Triggers: Track price and check for contrarian whale (non-blocking)
    if (tierResult?.marketId) {
      yield* Effect.all(
        [
          convex.trackTradePrice(tierResult.marketId, t.price).pipe(
            Effect.tap((result) => {
              if (result.priceMovementDetected) {
                console.log(
                  `  ⚡ TRIGGER: Price movement detected for ${row.title.slice(0, 30)}...`,
                );
              }
            }),
            Effect.catchAll(() => Effect.succeed(undefined)),
          ),
          convex
            .checkContrarianWhale(
              tierResult.marketId,
              t.proxyWallet ?? "",
              tradeSide as "YES" | "NO",
              sizeUsd,
            )
            .pipe(
              Effect.tap((result) => {
                if (result.isContrarian && result.triggerId) {
                  console.log(
                    `  🐋 TRIGGER: Contrarian whale detected! Score: ${result.score}`,
                  );
                }
              }),
              Effect.catchAll(() => Effect.succeed(undefined)),
            ),
        ],
        { concurrency: 2 },
      );
    }
  });
