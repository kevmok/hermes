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
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as markets from "../markets.js";
import type * as scheduledJobs from "../scheduledJobs.js";
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
  http: typeof http;
  insights: typeof insights;
  markets: typeof markets;
  scheduledJobs: typeof scheduledJobs;
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

export declare const components: {};
