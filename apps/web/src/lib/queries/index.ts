/**
 * Query option factories barrel export
 *
 * Usage in components:
 *   import { signalsQueries, tradesQueries } from "@/lib/queries";
 *   const { data } = useQuery(signalsQueries.latest({ limit: 10 }));
 *
 * Usage in loaders (SSR prefetching):
 *   import { signalsQueries } from "@/lib/queries";
 *   await queryClient.ensureQueryData({
 *     ...signalsQueries.latest({ limit: 20 }),
 *     revalidateIfStale: true,
 *   });
 */

export { signalsQueries, SIGNALS_STALE_TIME } from './signals';
export { tradesQueries, TRADES_STALE_TIME } from './trades';
export { marketsQueries, marketsActions, MARKETS_STALE_TIME } from './markets';
export { eventsActions, EVENTS_STALE_TIME } from './events';
