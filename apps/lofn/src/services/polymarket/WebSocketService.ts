import { Effect, Queue, Schema, type Ref } from "effect";
import type pl from "nodejs-polars";
import { CONFIG } from "../../config";
import { DataService } from "../data";
import {
  buildMarketRow,
  shouldIncludeTrade,
  type TradeData,
  updateMarketsRef,
  TradeMessageSchema,
  type TradeMessage,
} from "../../domain";

export const websocketEffect = Effect.gen(function* () {
  const { marketsRef } = yield* DataService;

  // Create a bounded queue for incoming messages (backpressure protection)
  const messageQueue = yield* Queue.bounded<TradeMessage>(1000);

  // Message processor fiber - runs continuously
  yield* Effect.fork(
    Effect.forever(
      Effect.gen(function* () {
        const msg = yield* Queue.take(messageQueue);
        yield* processTradeMessage(msg, marketsRef);
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

const processTradeMessage = (data: TradeMessage, marketsRef: Ref.Ref<pl.DataFrame>) =>
  Effect.gen(function* () {
    // Skip non-trade messages
    if (data.type !== "orders_matched" || !data.payload) return;

    const t = data.payload;

    // Validate required fields
    if (!t.conditionId || !t.title || !t.size || !t.price || !t.outcome) return;

    const sizeUsd = t.size * t.price;

    const tradeData: TradeData = {
      marketId: t.conditionId,
      eventSlug: t.eventSlug ?? "",
      title: t.title,
      outcome: t.outcome.toUpperCase(),
      price: t.price,
      sizeUsd,
    };

    // Use shared filter
    if (!shouldIncludeTrade(tradeData)) return;

    // Use shared row builder and update (Ref.update is atomic)
    const row = buildMarketRow(tradeData);
    yield* updateMarketsRef(marketsRef, row);

    console.log(`Trade: ${row.title.slice(0, 50)}... | $${sizeUsd.toFixed(0)}`);
  });
