import { Schema } from "effect";

export class MarketRow extends Schema.Class<MarketRow>("MarketRow")({
  market_id: Schema.String,
  event_slug: Schema.String,
  title: Schema.String,
  outcome: Schema.String, // "YES" or "NO"
  price: Schema.Number,
  size_usd: Schema.Number,
  timestamp: Schema.Date,
  first_seen: Schema.Date,
  last_trade_timestamp: Schema.Date,
  analyzed: Schema.Boolean.pipe(Schema.optionalWith({ default: () => false })),
}) {}

// Common trade data structure (runtime interface)
export interface TradeData {
  marketId: string;
  eventSlug: string;
  title: string;
  outcome: string;
  price: number;
  sizeUsd: number;
}

// Market row structure (runtime interface for Polars)
export interface MarketRowData {
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
