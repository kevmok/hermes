import { Effect, Ref } from "effect";
import pl from "nodejs-polars";
import {
  CONFIG,
  IGNORE_CRYPTO_KEYWORDS,
  IGNORE_SPORTS_KEYWORDS,
} from "./config";

// Common trade data structure
export interface TradeData {
  marketId: string;
  eventSlug: string;
  title: string;
  outcome: string;
  price: number;
  sizeUsd: number;
}

// Market row structure
export interface MarketRow {
  market_id: string;
  event_slug: string;
  title: string;
  outcome: string;
  price: number;
  size_usd: number;
  timestamp: string;
  first_seen: string;
  last_trade_timestamp: string;
  analyzed: boolean;
}

// Check if a trade should be included based on filters
export const shouldIncludeTrade = (trade: TradeData): boolean => {
  // Filter by size
  if (trade.sizeUsd < CONFIG.MIN_TRADE_SIZE_USD) return false;

  // Filter by price
  if (
    trade.price <= CONFIG.IGNORE_PRICE_LOW ||
    trade.price >= CONFIG.IGNORE_PRICE_HIGH
  )
    return false;

  // Filter by keywords
  const titleLower = trade.title.toLowerCase();
  const keywords = [...IGNORE_CRYPTO_KEYWORDS, ...IGNORE_SPORTS_KEYWORDS];
  if (keywords.some((k) => titleLower.includes(k))) return false;

  return true;
};

// Build a market row from trade data
export const buildMarketRow = (trade: TradeData): MarketRow => {
  const now = new Date().toISOString();
  return {
    market_id: trade.marketId,
    event_slug: trade.eventSlug,
    title: trade.title,
    outcome: trade.outcome,
    price: trade.price,
    size_usd: trade.sizeUsd,
    timestamp: now,
    first_seen: now,
    last_trade_timestamp: now,
    analyzed: false,
  };
};

// Update markets DataFrame with a new row
export const updateMarketsRef = (
  marketsRef: Ref.Ref<pl.DataFrame>,
  row: MarketRow
) =>
  Effect.gen(function* () {
    yield* Ref.update(marketsRef, (df) => {
      const existingMarkets = df.getColumn("market_id").toArray() as string[];
      const marketExists = existingMarkets.includes(row.market_id);

      if (marketExists) {
        // Update existing market - keep first_seen, update last_trade_timestamp
        return df.withColumns(
          pl.when(pl.col("market_id").eq(pl.lit(row.market_id)))
            .then(pl.lit(row.price))
            .otherwise(pl.col("price"))
            .alias("price"),
          pl.when(pl.col("market_id").eq(pl.lit(row.market_id)))
            .then(pl.lit(row.size_usd))
            .otherwise(pl.col("size_usd"))
            .alias("size_usd"),
          pl.when(pl.col("market_id").eq(pl.lit(row.market_id)))
            .then(pl.lit(row.last_trade_timestamp))
            .otherwise(pl.col("last_trade_timestamp"))
            .alias("last_trade_timestamp"),
          pl.when(pl.col("market_id").eq(pl.lit(row.market_id)))
            .then(pl.lit(row.timestamp))
            .otherwise(pl.col("timestamp"))
            .alias("timestamp")
        );
      } else {
        // Add new market
        const newDf = pl.DataFrame({
          market_id: [row.market_id],
          event_slug: [row.event_slug],
          title: [row.title],
          outcome: [row.outcome],
          price: [row.price],
          size_usd: [row.size_usd],
          timestamp: [row.timestamp],
          first_seen: [row.first_seen],
          last_trade_timestamp: [row.last_trade_timestamp],
          analyzed: [row.analyzed],
        });

        return df.height > 0 ? pl.concat([df, newDf]) : newDf;
      }
    });
  });
