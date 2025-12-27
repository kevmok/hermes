/**
 * Events query option factories
 *
 * Provides type-safe query options for Polymarket events API.
 * Events are fetched on-demand via actions (not stored in database).
 */
import { convexAction } from '@convex-dev/react-query';
import { api } from 'backend/convex/_generated/api';

// Default stale time for events (2 minutes)
const EVENTS_STALE_TIME = 1000 * 60 * 2;

/**
 * Action options for Polymarket Events API
 *
 * Events are fetched from Polymarket API with TTL caching on the backend.
 * Use convexAction() for actions instead of convexQuery() for queries.
 */
export const eventsActions = {
  /** Fetch event by slug from Polymarket API (cached) */
  bySlug: (slug: string) =>
    convexAction(api.polymarket.events.getEventBySlug, { slug }),

  /** Fetch event by ID from Polymarket API (cached) */
  byId: (id: string) =>
    convexAction(api.polymarket.events.getEventById, { id }),

  /** List events from Polymarket API (fresh) */
  list: (options?: {
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
      order: options?.order ?? 'volume24hr',
      ascending: options?.ascending ?? false,
    }),
} as const;

export { EVENTS_STALE_TIME };
