/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_models from "../ai/models.js";
import type * as ai_swarm from "../ai/swarm.js";
import type * as analysis from "../analysis.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as globalFilters from "../globalFilters.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as lib_errors from "../lib/errors.js";
import type * as markets from "../markets.js";
import type * as performanceMetrics from "../performanceMetrics.js";
import type * as polymarket_cache from "../polymarket/cache.js";
import type * as polymarket_client from "../polymarket/client.js";
import type * as polymarket_events from "../polymarket/events.js";
import type * as polymarket_index from "../polymarket/index.js";
import type * as polymarket_markets from "../polymarket/markets.js";
import type * as polymarket_schemas from "../polymarket/schemas.js";
import type * as polymarket_users from "../polymarket/users.js";
import type * as resolution from "../resolution.js";
import type * as scheduledJobs from "../scheduledJobs.js";
import type * as signals from "../signals.js";
import type * as trades from "../trades.js";
import type * as users from "../users.js";
import type * as watchlists from "../watchlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/models": typeof ai_models;
  "ai/swarm": typeof ai_swarm;
  analysis: typeof analysis;
  auth: typeof auth;
  crons: typeof crons;
  events: typeof events;
  globalFilters: typeof globalFilters;
  http: typeof http;
  insights: typeof insights;
  "lib/errors": typeof lib_errors;
  markets: typeof markets;
  performanceMetrics: typeof performanceMetrics;
  "polymarket/cache": typeof polymarket_cache;
  "polymarket/client": typeof polymarket_client;
  "polymarket/events": typeof polymarket_events;
  "polymarket/index": typeof polymarket_index;
  "polymarket/markets": typeof polymarket_markets;
  "polymarket/schemas": typeof polymarket_schemas;
  "polymarket/users": typeof polymarket_users;
  resolution: typeof resolution;
  scheduledJobs: typeof scheduledJobs;
  signals: typeof signals;
  trades: typeof trades;
  users: typeof users;
  watchlists: typeof watchlists;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  actionCache: {
    crons: {
      purge: FunctionReference<
        "mutation",
        "internal",
        { expiresAt?: number },
        null
      >;
    };
    lib: {
      get: FunctionReference<
        "query",
        "internal",
        { args: any; name: string; ttl: number | null },
        { kind: "hit"; value: any } | { expiredEntry?: string; kind: "miss" }
      >;
      put: FunctionReference<
        "mutation",
        "internal",
        {
          args: any;
          expiredEntry?: string;
          name: string;
          ttl: number | null;
          value: any;
        },
        { cacheHit: boolean; deletedExpiredEntry: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { args: any; name: string },
        null
      >;
      removeAll: FunctionReference<
        "mutation",
        "internal",
        { batchSize?: number; before?: number; name?: string },
        null
      >;
    };
  };
};
