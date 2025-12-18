import { Effect, Ref, Queue } from "effect";
import pl from "nodejs-polars";
import {
  CONFIG,
  IGNORE_CRYPTO_KEYWORDS,
  IGNORE_SPORTS_KEYWORDS,
} from "./config";
import { DataService } from "./data";

// Trade message structure (adjust based on actual Polymarket API)
interface TradeMessage {
  type: string;
  payload?: {
    market?: {
      id: string;
      slug: string;
      question: string;
    };
    volume?: string;
    price?: string;
    outcome?: string;
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
      })
    )
  );

  // WebSocket connection with reconnect logic
  yield* Effect.async<void, never>(() => {
    const connect = () => {
      console.log("Connecting to Polymarket WebSocket...");
      const ws = new WebSocket(CONFIG.WEBSOCKET_URL);

      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            method: "subscribe",
            subscription: { type: "orders_matched" },
          })
        );
        console.log("WebSocket connected & subscribed");
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data as string) as TradeMessage;
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
  marketsRef: Ref.Ref<pl.DataFrame>
) =>
  Effect.gen(function* () {
    // Skip non-trade messages
    if (data.type !== "orders_matched" || !data.payload) return;

    const t = data.payload;

    // Validate required fields
    if (!t.market?.id || !t.market?.question || !t.volume || !t.price) return;

    const volume = Number(t.volume);
    const price = Number(t.price);
    const sizeUsd = volume * price;

    // Filter by size
    if (sizeUsd < CONFIG.MIN_TRADE_SIZE_USD) return;

    // Filter by price
    if (price <= CONFIG.IGNORE_PRICE_LOW || price >= CONFIG.IGNORE_PRICE_HIGH)
      return;

    // Filter by keywords
    const titleLower = t.market.question.toLowerCase();
    const keywords = [...IGNORE_CRYPTO_KEYWORDS, ...IGNORE_SPORTS_KEYWORDS];
    if (keywords.some((k) => titleLower.includes(k))) return;

    // Build new row
    const now = new Date().toISOString();
    const newRow = {
      market_id: t.market.id,
      event_slug: t.market.slug ?? "",
      title: t.market.question,
      outcome: t.outcome === "yes" ? "YES" : "NO",
      price,
      size_usd: sizeUsd,
      timestamp: now,
      first_seen: now,
      last_trade_timestamp: now,
      analyzed: false,
    };

    // Update DataFrame
    yield* Ref.update(marketsRef, (df) => {
      // Check if market already exists
      const existingMarkets = df.getColumn("market_id").toArray() as string[];
      const marketExists = existingMarkets.includes(newRow.market_id);

      if (marketExists) {
        // Update existing market - keep first_seen, update last_trade_timestamp
        return df.withColumns(
          pl.when(pl.col("market_id").eq(pl.lit(newRow.market_id)))
            .then(pl.lit(newRow.price))
            .otherwise(pl.col("price"))
            .alias("price"),
          pl.when(pl.col("market_id").eq(pl.lit(newRow.market_id)))
            .then(pl.lit(newRow.size_usd))
            .otherwise(pl.col("size_usd"))
            .alias("size_usd"),
          pl.when(pl.col("market_id").eq(pl.lit(newRow.market_id)))
            .then(pl.lit(now))
            .otherwise(pl.col("last_trade_timestamp"))
            .alias("last_trade_timestamp"),
          pl.when(pl.col("market_id").eq(pl.lit(newRow.market_id)))
            .then(pl.lit(now))
            .otherwise(pl.col("timestamp"))
            .alias("timestamp")
        );
      } else {
        // Add new market
        const newDf = pl.DataFrame({
          market_id: [newRow.market_id],
          event_slug: [newRow.event_slug],
          title: [newRow.title],
          outcome: [newRow.outcome],
          price: [newRow.price],
          size_usd: [newRow.size_usd],
          timestamp: [newRow.timestamp],
          first_seen: [newRow.first_seen],
          last_trade_timestamp: [newRow.last_trade_timestamp],
          analyzed: [newRow.analyzed],
        });

        return df.height > 0 ? pl.concat([df, newDf]) : newDf;
      }
    });

    console.log(
      `Trade: ${newRow.title.slice(0, 50)}... | $${sizeUsd.toFixed(0)}`
    );
  });
