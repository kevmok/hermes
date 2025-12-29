import { Effect, Ref } from "effect";
import pl from "nodejs-polars";
import {
  CONFIG,
  IGNORE_CRYPTO_KEYWORDS,
  IGNORE_SPORTS_KEYWORDS,
} from "../../config";
import type { TradeData, MarketRowData } from "./types";
import { filterMarketWithAI } from "./ai-filter";

/**
 * Fast keyword-based filter (synchronous).
 * First pass to filter obvious crypto/sports markets.
 */
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
  const keywords = [...IGNORE_CRYPTO_KEYWORDS, ...IGNORE_SPORTS_KEYWORDS];

  const titleLower = trade.title.toLowerCase();
  if (keywords.some((k) => titleLower.includes(k))) return false;

  const slugLower = trade.eventSlug.toLowerCase();
  if (keywords.some((k) => slugLower.includes(k))) return false;

  return true;
};

/**
 * Combined filter with AI-powered emotional market detection.
 * First runs fast keyword filter, then AI filter for edge cases.
 */
export const shouldIncludeTradeWithAI = (trade: TradeData) =>
  Effect.gen(function* () {
    // First pass: fast keyword filter
    if (!shouldIncludeTrade(trade)) {
      return { include: false, reason: "Failed keyword filter" };
    }

    // Second pass: AI filter for emotional markets
    const aiResult = yield* filterMarketWithAI({
      title: trade.title,
      eventSlug: trade.eventSlug,
    });

    if (!aiResult.shouldInclude) {
      console.log(
        `AI filtered: ${trade.title.slice(0, 40)}... | ${aiResult.category} (${aiResult.emotionalLevel}) - ${aiResult.reason}`,
      );
      return { include: false, reason: aiResult.reason };
    }

    console.log("AI passed:", trade.title.slice(0, 40));

    return { include: true, reason: "Passed all filters" };
  });

// Build a market row from trade data
export const buildMarketRow = (trade: TradeData): MarketRowData => {
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

// Update markets DataFrame with a new row (Ref.update is atomic via compare-and-swap)
export const updateMarketsRef = (
  marketsRef: Ref.Ref<pl.DataFrame>,
  row: MarketRowData,
) =>
  Ref.update(marketsRef, (df) => {
    const existingMarkets = df.getColumn("market_id").toArray() as string[];
    const marketExists = existingMarkets.includes(row.market_id);

    if (marketExists) {
      // Update existing market - keep first_seen, update last_trade_timestamp
      return df.withColumns(
        pl
          .when(pl.col("market_id").eq(pl.lit(row.market_id)))
          .then(pl.lit(row.price))
          .otherwise(pl.col("price"))
          .alias("price"),
        pl
          .when(pl.col("market_id").eq(pl.lit(row.market_id)))
          .then(pl.lit(row.size_usd))
          .otherwise(pl.col("size_usd"))
          .alias("size_usd"),
        pl
          .when(pl.col("market_id").eq(pl.lit(row.market_id)))
          .then(pl.lit(row.last_trade_timestamp))
          .otherwise(pl.col("last_trade_timestamp"))
          .alias("last_trade_timestamp"),
        pl
          .when(pl.col("market_id").eq(pl.lit(row.market_id)))
          .then(pl.lit(row.timestamp))
          .otherwise(pl.col("timestamp"))
          .alias("timestamp"),
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
