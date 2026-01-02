import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import type { Id } from "backend/convex/_generated/dataModel";

const SMART_TRIGGERS_STALE_TIME = 1000 * 60;

export const smartTriggersQueries = {
  topTriggers: (limit?: number) =>
    convexQuery(api.smartTriggers.getTopTriggers, {
      limit: limit ?? 20,
    }),

  byMarket: (marketId: Id<"markets">) =>
    convexQuery(api.smartTriggers.getActiveTriggersForMarket, {
      marketId,
    }),
} as const;

export { SMART_TRIGGERS_STALE_TIME };
