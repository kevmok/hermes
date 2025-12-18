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

export class IndividualPrediction extends Schema.Class<IndividualPrediction>(
  "IndividualPrediction",
)({
  decision: Schema.Literal("YES", "NO", "NO_TRADE"),
  reasoning: Schema.String,
}) {}

export class ConsensusPick extends Schema.Class<ConsensusPick>("ConsensusPick")(
  {
    timestamp: Schema.Date,
    run_id: Schema.String,
    rank: Schema.Number,
    market_number: Schema.Number,
    market_title: Schema.String,
    side: Schema.Literal("YES", "NO", "NO_TRADE"),
    consensus: Schema.String, // e.g., "5 out of 6 models agreed"
    consensus_count: Schema.Number,
    total_models: Schema.Number,
    link: Schema.String,
    reasoning: Schema.String,
  },
) {}
