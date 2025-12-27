/**
 * Trades query option factories
 *
 * Provides type-safe query options for Convex trades queries.
 * Use with useQuery() in components or ensureQueryData() in loaders.
 */
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import type { Id } from 'backend/convex/_generated/dataModel';

// Default stale time for trades (15 seconds for real-time feed)
const TRADES_STALE_TIME = 1000 * 15;

/**
 * Query options for trades
 */
export const tradesQueries = {
  /** List all trades with pagination */
  list: (options?: { limit?: number; cursor?: string }) =>
    convexQuery(api.trades.listTrades, {
      limit: options?.limit ?? 50,
      cursor: options?.cursor,
    }),

  /** List whale trades only with pagination */
  whales: (options?: { limit?: number; cursor?: string }) =>
    convexQuery(api.trades.listWhaleTrades, {
      limit: options?.limit ?? 50,
      cursor: options?.cursor,
    }),

  /** Get trades by market slug */
  byMarket: (slug: string, limit?: number) =>
    convexQuery(api.trades.getTradesByMarket, {
      slug,
      limit: limit ?? 50,
    }),

  /** Get trades by event slug */
  byEvent: (eventSlug: string, limit?: number) =>
    convexQuery(api.trades.getTradesByEvent, {
      eventSlug,
      limit: limit ?? 50,
    }),

  /** Get trades by wallet address */
  byWallet: (proxyWallet: string, limit?: number) =>
    convexQuery(api.trades.getTradesByWallet, {
      proxyWallet,
      limit: limit ?? 50,
    }),

  /** Get trades linked to a signal */
  bySignal: (signalId: Id<'signals'>) =>
    convexQuery(api.trades.getTradesBySignal, { signalId }),

  /** Get trade statistics */
  stats: (sinceTimestamp?: number) =>
    convexQuery(api.trades.getTradeStats, {
      sinceTimestamp,
    }),
} as const;

export { TRADES_STALE_TIME };
