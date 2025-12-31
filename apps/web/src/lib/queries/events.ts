/**
 * Events query option factories
 *
 * Provides type-safe query options for tracked events.
 * Events are derived from trades captured via WebSocket (not from Polymarket API).
 */
import { convexQuery, convexAction } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";

// Default stale time for events (30 seconds - events update from trades)
const EVENTS_STALE_TIME = 1000 * 30;

/**
 * Query options for tracked events (from database)
 *
 * Events are automatically created when trades are captured via WebSocket.
 * These queries return only events we're actively tracking.
 */
export const eventsQueries = {
  /** List tracked events (from our database) */
  tracked: (options?: {
    limit?: number;
    sortBy?: "recent" | "volume";
    activeOnly?: boolean;
  }) =>
    convexQuery(api.events.listTrackedEvents, {
      limit: options?.limit ?? 50,
      sortBy: options?.sortBy ?? "recent",
      activeOnly: options?.activeOnly ?? false,
    }),

  /** Get event by slug (from database) */
  bySlug: (eventSlug: string) =>
    convexQuery(api.events.getEventBySlug, { eventSlug }),

  /** Get event with its markets */
  withMarkets: (eventSlug: string) =>
    convexQuery(api.events.getEventWithMarkets, { eventSlug }),

  /** Get events with signal counts (for dashboard) */
  withSignals: (limit?: number) =>
    convexQuery(api.events.getEventsWithSignalCounts, { limit }),

  /** Get event stats */
  stats: () => convexQuery(api.events.getEventStats, {}),
} as const;

/**
 * Action options for Polymarket Events API (on-demand)
 *
 * Use these to fetch real-time prices and details from Polymarket.
 * Data is cached on the backend with TTL.
 */
export const eventsActions = {
  /** Fetch event by slug from Polymarket API (cached) */
  fetchBySlug: (slug: string) =>
    convexAction(api.polymarket.events.getEventBySlug, { slug }),

  /** Fetch event by ID from Polymarket API (cached) */
  fetchById: (id: string) =>
    convexAction(api.polymarket.events.getEventById, { id }),

  /** List events from Polymarket API (fresh) - for browsing all markets */
  fetchList: (options?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    order?: string;
    ascending?: boolean;
  }) =>
    convexAction(api.polymarket.events.listEvents, {
      limit: options?.limit ?? 20,
      offset: options?.offset,
      active: options?.active ?? true,
      closed: options?.closed,
      order: options?.order ?? "volume24hr",
      ascending: options?.ascending ?? false,
    }),
} as const;

export { EVENTS_STALE_TIME };
