import { Schema } from "effect";

// WebSocket trade payload schema - all fields optional, we validate required ones in processing
const TradePayloadFields = Schema.Struct({
  proxyWallet: Schema.String,
  side: Schema.String,
  asset: Schema.String,
  conditionId: Schema.String,
  size: Schema.Number,
  price: Schema.Number,
  timestamp: Schema.Number,
  title: Schema.String,
  slug: Schema.String,
  icon: Schema.String,
  eventSlug: Schema.String,
  outcome: Schema.String,
  outcomeIndex: Schema.Number,
  name: Schema.String,
  pseudonym: Schema.String,
  bio: Schema.String,
  profileImage: Schema.String,
  transactionHash: Schema.String,
});

export const TradePayloadSchema = Schema.partial(TradePayloadFields);

// WebSocket trade message schema
export const TradeMessageSchema = Schema.Struct({
  type: Schema.String,
  topic: Schema.String,
  timestamp: Schema.Number,
  connection_id: Schema.String,
  payload: Schema.optional(TradePayloadSchema),
});

export type TradeMessage = Schema.Schema.Type<typeof TradeMessageSchema>;
export type TradePayload = Schema.Schema.Type<typeof TradePayloadSchema>;

// Historical trade schema (from REST API) - all fields optional for flexibility
const HistoricalTradeFields = Schema.Struct({
  proxyWallet: Schema.String,
  side: Schema.String,
  asset: Schema.String,
  conditionId: Schema.String,
  size: Schema.Number,
  price: Schema.Number,
  timestamp: Schema.Number,
  title: Schema.String,
  slug: Schema.String,
  icon: Schema.String,
  eventSlug: Schema.String,
  outcome: Schema.String,
  outcomeIndex: Schema.Number,
  name: Schema.String,
  pseudonym: Schema.String,
  bio: Schema.String,
  profileImage: Schema.String,
  profileImageOptimized: Schema.String,
  transactionHash: Schema.String,
});

export const HistoricalTradeSchema = Schema.partial(HistoricalTradeFields);

export const HistoricalTradesResponseSchema = Schema.Array(HistoricalTradeSchema);

export type HistoricalTrade = Schema.Schema.Type<typeof HistoricalTradeSchema>;

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
