/**
 * Markets query option factories
 *
 * Provides type-safe query options for Convex markets queries.
 * Use with useQuery() in components or ensureQueryData() in loaders.
 */
import { convexQuery, convexAction } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import type { Id } from "backend/convex/_generated/dataModel";

// Default stale time for markets (1 minute)
const MARKETS_STALE_TIME = 1000 * 60;

/**
 * Query options for markets (database queries - reactive)
 * Note: Markets table no longer stores volatile data (prices, volume)
 * Use marketsActions to fetch real-time data from Polymarket API
 */
export const marketsQueries = {
  /** List active markets with sorting */
  active: (options?: {
    limit?: number;
    eventSlug?: string;
    sortBy?: "recent" | "analyzed" | "volume";
  }) =>
    convexQuery(api.markets.listActiveMarkets, {
      limit: options?.limit ?? 20,
      eventSlug: options?.eventSlug,
      sortBy: options?.sortBy,
    }),

  /** Get a single market by ID */
  byId: (marketId: Id<"markets"> | null) =>
    convexQuery(api.markets.getMarket, { marketId }),

  /** Get market by Polymarket ID */
  byPolymarketId: (polymarketId: string) =>
    convexQuery(api.markets.getMarketByPolymarketId, { polymarketId }),

  /** Search markets by title */
  search: (query: string, limit?: number) =>
    convexQuery(api.markets.searchMarkets, {
      query,
      limit: limit ?? 20,
    }),

  /** Get market snapshots for charting */
  snapshots: (
    marketId: Id<"markets">,
    options?: { since?: number; limit?: number },
  ) =>
    convexQuery(api.markets.getMarketSnapshots, {
      marketId,
      since: options?.since,
      limit: options?.limit ?? 500,
    }),

  /** Get resolved markets */
  resolved: (options?: { limit?: number; since?: number }) =>
    convexQuery(api.markets.getResolvedMarkets, {
      limit: options?.limit ?? 100,
      since: options?.since,
    }),

  /** Get unresolved markets with signals */
  unresolvedWithSignals: (limit?: number) =>
    convexQuery(api.markets.getUnresolvedMarketsWithSignals, {
      limit: limit ?? 100,
    }),
} as const;

/**
 * Action options for Polymarket API (on-demand fetching)
 */
export const marketsActions = {
  /** Fetch market by slug from Polymarket API (cached) */
  fetchBySlug: (slug: string) =>
    convexAction(api.polymarket.markets.getMarketBySlug, { slug }),

  /** Fetch market by ID from Polymarket API (cached) */
  fetchById: (id: string) =>
    convexAction(api.polymarket.markets.getMarketById, { id }),

  /** List markets from Polymarket API (fresh) */
  fetchList: (options?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  }) =>
    convexAction(api.polymarket.markets.listMarkets, {
      limit: options?.limit,
      offset: options?.offset,
      active: options?.active,
      closed: options?.closed,
    }),
} as const;

export { MARKETS_STALE_TIME };
