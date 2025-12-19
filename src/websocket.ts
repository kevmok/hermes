import { Effect, Queue, type Ref } from "effect";
import type pl from "nodejs-polars";
import { CONFIG } from "./config";
import { DataService } from "./data";
import {
  buildMarketRow,
  shouldIncludeTrade,
  type TradeData,
  updateMarketsRef,
} from "./filters";

// Trade message structure from Polymarket WebSocket
interface TradeMessage {
  type: string;
  topic: string;
  timestamp: number;
  connection_id: string;
  payload?: {
    proxyWallet: string;
    side: string;
    asset: string;
    conditionId: string;
    size: number;
    price: number;
    timestamp: number;
    title: string;
    slug: string;
    icon: string;
    eventSlug: string;
    outcome: string;
    outcomeIndex: number;
    name: string;
    pseudonym: string;
    bio: string;
    profileImage: string;
    transactionHash: string;
  };
}

export const websocketEffect = Effect.gen(function* () {
  const { marketsRef } = yield* DataService;

  // Create a queue for incoming messages
  const messageQueue = yield* Queue.unbounded<TradeMessage>();

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
          const data = JSON.parse(event.data) as TradeMessage;
          // Non-blocking offer to queue
          Effect.runSync(Queue.offer(messageQueue, data));
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
) =>
  Effect.gen(function* () {
    // Skip non-trade messages
    if (data.type !== "orders_matched" || !data.payload) return;

    const t = data.payload;

    // Validate required fields
    if (!t.conditionId || !t.title || !t.size || !t.price) return;

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

    // Use shared row builder and update
    const row = buildMarketRow(tradeData);
    yield* updateMarketsRef(marketsRef, row);

    console.log(`Trade: ${row.title.slice(0, 50)}... | $${sizeUsd.toFixed(0)}`);
  });
