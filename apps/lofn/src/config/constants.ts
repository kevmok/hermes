export const CONFIG = {
  MIN_TRADE_SIZE_USD: 5000,
  IGNORE_PRICE_LOW: 0.02,
  IGNORE_PRICE_HIGH: 0.98,
  NEW_MARKETS_FOR_ANALYSIS: 3,
  MARKETS_TO_ANALYZE: 3,
  ANALYSIS_CHECK_INTERVAL_SECONDS: 300,
  TOP_MARKETS_COUNT: 5,
  USE_SWARM_MODE: true,
  SEND_PRICE_INFO_TO_AI: false,
  DATA_FOLDER: "./data/polymarket",
  WEBSOCKET_URL: "wss://ws-live-data.polymarket.com",
  TRADES_API_URL: "https://data-api.polymarket.com/trades",
  HISTORICAL_HOURS_BACK: 24,
  HISTORICAL_LIMIT: 1000,
} as const;

export const ANALYSIS_TIERS = {
  BRONZE_MIN: 5000,
  BRONZE_MAX: 15000,
  SILVER_MIN: 15000,
  SILVER_MAX: 50000,
  GOLD_MIN: 50000,
  GOLD_MAX: 100000,
  PLATINUM_MIN: 100000,
} as const;

export type AnalysisTier = "bronze" | "silver" | "gold" | "platinum";

export const getTierForTradeSize = (sizeUsd: number): AnalysisTier | null => {
  if (sizeUsd < ANALYSIS_TIERS.BRONZE_MIN) return null;
  if (sizeUsd < ANALYSIS_TIERS.BRONZE_MAX) return "bronze";
  if (sizeUsd < ANALYSIS_TIERS.SILVER_MAX) return "silver";
  if (sizeUsd < ANALYSIS_TIERS.GOLD_MAX) return "gold";
  return "platinum";
};

export const IGNORE_CRYPTO_KEYWORDS = [
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "crypto",
  "solana",
  "sol",
  "dogecoin",
  "doge",
  "shiba",
  "cardano",
  "ada",
  "ripple",
  "xrp",
] as const;

export const IGNORE_SPORTS_KEYWORDS = [
  "nba",
  "nfl",
  "mlb",
  "nhl",
  "mls",
  "ufc",
  "boxing",
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "super bowl",
  "world series",
  "playoffs",
  "championship",
  "lakers",
  "warriors",
  "celtics",
  "knicks",
  "heat",
  "bucks",
  "cowboys",
  "patriots",
  "chiefs",
  "eagles",
  "packers",
  "yankees",
  "dodgers",
  "red sox",
  "mets",
  "premier league",
  "la liga",
  "champions league",
  "tennis",
  "golf",
  "nascar",
  "formula 1",
  "f1",
  "cricket",
] as const;
