/**
 * Polymarket API Client using Effect.ts
 *
 * Uses native fetch wrapped in Effect for compatibility with Convex runtime.
 * Provides type-safe access to Polymarket's Gamma and Data APIs.
 */
import { Effect, Schedule, Duration } from "effect";
import type {
  Event,
  Market,
  Position,
  UserTrade,
  Activity,
  PortfolioValue,
  ClosedPosition,
  LeaderboardEntry,
  ListEventsParams,
  ListMarketsParams,
  PositionsParams,
  TradesParams,
  ActivityParams,
  ClosedPositionsParams,
  LeaderboardParams,
} from "./schemas";

// ============ BASE URLS ============

const GAMMA_API = "https://gamma-api.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";

// ============ ERROR TYPE ============

export class PolymarketApiError extends Error {
  readonly _tag = "PolymarketApiError";
  readonly statusCode?: number;
  readonly endpoint: string;

  constructor(message: string, endpoint: string, statusCode?: number) {
    super(message);
    this.name = "PolymarketApiError";
    this.endpoint = endpoint;
    this.statusCode = statusCode;
  }
}

// ============ RETRY SCHEDULE ============

const retrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.intersect(Schedule.recurs(3))
);

// ============ HTTP HELPERS ============

const fetchJson = <T>(url: string): Effect.Effect<T, PolymarketApiError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        throw new PolymarketApiError(
          `HTTP ${response.status}: ${text}`,
          url,
          response.status
        );
      }

      return (await response.json()) as T;
    },
    catch: (e) => {
      if (e instanceof PolymarketApiError) return e;
      return new PolymarketApiError(`Network error: ${e}`, url);
    },
  }).pipe(Effect.retry(retrySchedule));

const fetchJsonArray = <T>(url: string): Effect.Effect<T[], PolymarketApiError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        throw new PolymarketApiError(
          `HTTP ${response.status}: ${text}`,
          url,
          response.status
        );
      }

      const json = await response.json();

      if (!Array.isArray(json)) {
        throw new PolymarketApiError("Expected array response", url);
      }

      return json as T[];
    },
    catch: (e) => {
      if (e instanceof PolymarketApiError) return e;
      return new PolymarketApiError(`Network error: ${e}`, url);
    },
  }).pipe(Effect.retry(retrySchedule));

// ============ EVENTS API ============

export const getEventBySlug = (
  slug: string
): Effect.Effect<Event, PolymarketApiError> =>
  fetchJson<Event>(`${GAMMA_API}/events/slug/${encodeURIComponent(slug)}`);

export const getEventById = (
  id: string
): Effect.Effect<Event, PolymarketApiError> =>
  fetchJson<Event>(`${GAMMA_API}/events/${encodeURIComponent(id)}`);

export const listEvents = (
  params: ListEventsParams = {}
): Effect.Effect<Event[], PolymarketApiError> => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));
  if (params.active !== undefined) query.set("active", String(params.active));
  if (params.closed !== undefined) query.set("closed", String(params.closed));
  if (params.order) query.set("order", params.order);
  if (params.ascending !== undefined)
    query.set("ascending", String(params.ascending));

  return fetchJsonArray<Event>(`${GAMMA_API}/events?${query}`);
};

// ============ MARKETS API ============

export const getMarketBySlug = (
  slug: string
): Effect.Effect<Market, PolymarketApiError> =>
  fetchJson<Market>(
    `${GAMMA_API}/markets/slug/${encodeURIComponent(slug)}`
  );

export const getMarketById = (
  id: string
): Effect.Effect<Market, PolymarketApiError> =>
  fetchJson<Market>(`${GAMMA_API}/markets/${encodeURIComponent(id)}`);

export const listMarkets = (
  params: ListMarketsParams = {}
): Effect.Effect<Market[], PolymarketApiError> => {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));
  if (params.active !== undefined) query.set("active", String(params.active));
  if (params.closed !== undefined) query.set("closed", String(params.closed));

  return fetchJsonArray<Market>(`${GAMMA_API}/markets?${query}`);
};

// ============ USER POSITIONS API ============

export const getUserPositions = (
  user: string,
  params: PositionsParams = {}
): Effect.Effect<Position[], PolymarketApiError> => {
  const query = new URLSearchParams({ user });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.sizeThreshold)
    query.set("sizeThreshold", String(params.sizeThreshold));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDirection) query.set("sortDirection", params.sortDirection);

  return fetchJsonArray<Position>(`${DATA_API}/positions?${query}`);
};

// ============ USER TRADES API ============

export const getUserTrades = (
  user: string,
  params: TradesParams = {}
): Effect.Effect<UserTrade[], PolymarketApiError> => {
  const query = new URLSearchParams({ user });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.side) query.set("side", params.side);

  return fetchJsonArray<UserTrade>(`${DATA_API}/trades?${query}`);
};

// ============ USER ACTIVITY API ============

export const getUserActivity = (
  user: string,
  params: ActivityParams = {}
): Effect.Effect<Activity[], PolymarketApiError> => {
  const query = new URLSearchParams({ user });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.type) query.set("type", params.type);
  if (params.start) query.set("start", String(params.start));
  if (params.end) query.set("end", String(params.end));

  return fetchJsonArray<Activity>(`${DATA_API}/activity?${query}`);
};

// ============ PORTFOLIO VALUE API ============

export const getPortfolioValue = (
  user: string
): Effect.Effect<PortfolioValue | null, PolymarketApiError> =>
  Effect.map(
    fetchJsonArray<PortfolioValue>(
      `${DATA_API}/value?user=${encodeURIComponent(user)}`
    ),
    (results) => results[0] ?? null
  );

// ============ CLOSED POSITIONS API ============

export const getClosedPositions = (
  user: string,
  params: ClosedPositionsParams = {}
): Effect.Effect<ClosedPosition[], PolymarketApiError> => {
  const query = new URLSearchParams({ user });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDirection) query.set("sortDirection", params.sortDirection);

  return fetchJsonArray<ClosedPosition>(
    `${DATA_API}/closed-positions?${query}`
  );
};

// ============ LEADERBOARD API ============

export const getLeaderboard = (
  params: LeaderboardParams = {}
): Effect.Effect<LeaderboardEntry[], PolymarketApiError> => {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.timePeriod) query.set("timePeriod", params.timePeriod);
  if (params.orderBy) query.set("orderBy", params.orderBy);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));

  return fetchJsonArray<LeaderboardEntry>(
    `${DATA_API}/v1/leaderboard?${query}`
  );
};

// ============ UTILITY ============

/**
 * Validate Ethereum address format
 */
export const isValidAddress = (address: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(address);

// ============ PROMISE-BASED API (for Convex actions) ============
// These wrap Effect programs in Promises to avoid type complexity in Convex

export const api = {
  // Events
  getEventBySlug: (slug: string) => Effect.runPromise(getEventBySlug(slug)),
  getEventById: (id: string) => Effect.runPromise(getEventById(id)),
  listEvents: (params: ListEventsParams = {}) => Effect.runPromise(listEvents(params)),

  // Markets
  getMarketBySlug: (slug: string) => Effect.runPromise(getMarketBySlug(slug)),
  getMarketById: (id: string) => Effect.runPromise(getMarketById(id)),
  listMarkets: (params: ListMarketsParams = {}) => Effect.runPromise(listMarkets(params)),

  // User data
  getUserPositions: (user: string, params: PositionsParams = {}) =>
    Effect.runPromise(getUserPositions(user, params)),
  getUserTrades: (user: string, params: TradesParams = {}) =>
    Effect.runPromise(getUserTrades(user, params)),
  getUserActivity: (user: string, params: ActivityParams = {}) =>
    Effect.runPromise(getUserActivity(user, params)),
  getPortfolioValue: (user: string) => Effect.runPromise(getPortfolioValue(user)),
  getClosedPositions: (user: string, params: ClosedPositionsParams = {}) =>
    Effect.runPromise(getClosedPositions(user, params)),
  getLeaderboard: (params: LeaderboardParams = {}) =>
    Effect.runPromise(getLeaderboard(params)),
};
