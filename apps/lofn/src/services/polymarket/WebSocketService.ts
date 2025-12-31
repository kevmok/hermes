import { Context, Effect, Queue, Schema, type Ref } from "effect";
import type pl from "nodejs-polars";
import { CONFIG } from "../../config";
import { DataService } from "../data";
import {
  ConvexDataService,
  type MarketDataWithTrade,
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

    // 2. Determine trade side for signal context
    const tradeSide = t.outcome.toUpperCase() === "YES" ? "YES" : "NO";

    // 3. Send to Convex with trade context - triggers signal generation
    // Note: Simplified market data - no volatile prices/volumes (fetched on-demand from API)
    const marketDataWithTrade: MarketDataWithTrade = {
      polymarketId: t.conditionId,
      conditionId: t.conditionId,
      slug: t.slug ?? t.conditionId, // Use slug from trade, fallback to conditionId
      eventSlug: t.eventSlug ?? "",
      title: t.title,
      isActive: true,
      tradeContext: {
        size: sizeUsd,
        price: t.price,
        side: tradeSide as "YES" | "NO",
        taker: t.proxyWallet, // proxyWallet is the taker address
        timestamp: Date.now(),
      },
    };

    // 4. Build raw trade data for the trades table
    const rawTrade: RawTradeData = {
      conditionId: t.conditionId,
      slug: t.slug ?? "",
      eventSlug: t.eventSlug ?? "",
      title: t.title, // Include market title for display
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
      isWhale: true, // Passed shouldIncludeTrade filter, so it's a whale trade
      traderName: t.name,
      traderPseudonym: t.pseudonym,
    };

    // 5. Send to Convex in parallel: market upsert + raw trade storage
    yield* Effect.all(
      [
        convex.upsertMarketWithTrade(marketDataWithTrade).pipe(
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

    console.log(
      `Trade: ${row.title.slice(0, 50)}... | $${sizeUsd.toFixed(0)} ${tradeSide} → Signal Pipeline`,
    );
  });
