/**
 * Polymarket API Client - Convex Actions
 *
 * Re-exports all public Convex actions for the Polymarket API.
 * These actions use ActionCache for TTL-based caching of responses.
 *
 * Usage in frontend:
 * ```typescript
 * import { useAction } from "convex/react";
 * import { api } from "../convex/_generated/api";
 *
 * const getEvent = useAction(api.polymarket.events.getEventBySlug);
 * const event = await getEvent({ slug: "my-event" });
 * ```
 */

// ============ EVENTS ============
export {
  getEventBySlug,
  getEventById,
  listEvents,
  invalidateEventBySlug,
  invalidateEventById,
} from "./events";

// ============ MARKETS ============
export {
  getMarketBySlug,
  getMarketById,
  listMarkets,
  invalidateMarketBySlug,
  invalidateMarketById,
} from "./markets";

// ============ USERS ============
export {
  getUserPositions,
  getUserTrades,
  getUserActivity,
  getPortfolioValue,
  getClosedPositions,
  getLeaderboard,
  invalidateUserPositions,
  invalidateUserData,
} from "./users";

// ============ CACHE CONFIG ============
export { CACHE_TTL } from "./cache";
