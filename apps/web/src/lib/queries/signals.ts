/**
 * Signal query option factories
 *
 * Provides type-safe query options for Convex signals queries.
 * Use with useQuery() in components or ensureQueryData() in loaders.
 */
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';
import type { Id } from 'backend/convex/_generated/dataModel';

// Default stale time for signals (30 seconds for real-time feel)
const SIGNALS_STALE_TIME = 1000 * 30;

/**
 * Query options for latest signals feed
 */
export const signalsQueries = {
  /** Get latest signals with optional filters */
  latest: (options?: { limit?: number; onlyHighConfidence?: boolean }) =>
    convexQuery(api.signals.getLatestSignals, {
      limit: options?.limit ?? 20,
      onlyHighConfidence: options?.onlyHighConfidence,
    }),

  /** Get signals with pagination */
  paginated: (options?: {
    limit?: number;
    onlyHighConfidence?: boolean;
    decision?: 'YES' | 'NO' | 'NO_TRADE';
    cursor?: Id<'signals'>;
  }) =>
    convexQuery(api.signals.getSignalsWithPagination, {
      limit: options?.limit ?? 20,
      onlyHighConfidence: options?.onlyHighConfidence,
      decision: options?.decision,
      cursor: options?.cursor,
    }),

  /** Get signals for a specific market */
  byMarket: (marketId: Id<'markets'> | null, limit?: number) =>
    convexQuery(api.signals.getSignalsByMarket, {
      marketId,
      limit: limit ?? 50,
    }),

  /** Get signal stats for dashboard */
  stats: () => convexQuery(api.signals.getSignalStats, {}),

  /** Get signal with related predictions */
  withPredictions: (signalId: Id<'signals'>) =>
    convexQuery(api.signals.getSignalWithPredictions, { signalId }),

  /** Get signals since a timestamp (for notifications) */
  since: (timestamp: number, limit?: number) =>
    convexQuery(api.signals.getSignalsSince, {
      since: timestamp,
      limit: limit ?? 20,
    }),
} as const;

export { SIGNALS_STALE_TIME };
