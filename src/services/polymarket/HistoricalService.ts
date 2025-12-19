import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect } from "effect";
import { CONFIG } from "../../config";
import { DataService } from "../data";
import {
  buildMarketRow,
  shouldIncludeTrade,
  type TradeData,
  updateMarketsRef,
} from "../../domain";

// Response shape from Polymarket trades API
interface HistoricalTrade {
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
  profileImageOptimized: string;
  transactionHash: string;
}

export const fetchHistoricalTrades = Effect.gen(function* () {
  const { marketsRef } = yield* DataService;
  const client = yield* HttpClient.HttpClient;

  // Calculate timestamp from hours ago
  const hoursAgoMs = CONFIG.HISTORICAL_HOURS_BACK * 60 * 60 * 1000;
  const minTimestamp = Math.floor((Date.now() - hoursAgoMs) / 1000);
  console.log(`Min timestamp: ${minTimestamp}`);
  const url = `${CONFIG.TRADES_API_URL}?limit=${CONFIG.HISTORICAL_LIMIT}&_min_timestamp=${minTimestamp}`;

  console.log(
    `Fetching historical trades from last ${CONFIG.HISTORICAL_HOURS_BACK} hours...`,
  );

  const response = yield* client.execute(HttpClientRequest.get(url)).pipe(
    Effect.flatMap((res) => res.json),
    Effect.catchAll((error) => {
      console.error("Failed to fetch historical trades:", error);
      return Effect.succeed([] as HistoricalTrade[]);
    }),
  );

  const trades = response as HistoricalTrade[];
  let processedCount = 0;
  let filteredCount = 0;

  for (const trade of trades) {
    const sizeUsd = trade.size * trade.price;

    const tradeData: TradeData = {
      marketId: trade.conditionId,
      eventSlug: trade.eventSlug ?? "",
      title: trade.title ?? `Market ${trade.conditionId}`,
      outcome: trade.outcome.toUpperCase(),
      price: trade.price,
      sizeUsd,
    };

    if (!shouldIncludeTrade(tradeData)) {
      filteredCount++;
      continue;
    }

    const row = buildMarketRow(tradeData);
    yield* updateMarketsRef(marketsRef, row);
    processedCount++;
  }

  console.log(
    `Historical trades: ${processedCount} processed, ${filteredCount} filtered, ${trades.length} total`,
  );
});
