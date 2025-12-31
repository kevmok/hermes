import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";
import { signalsQueries } from "@/lib/queries";
import { queryClient } from "@/lib/providers/query";

// Search params schema with zod validation
const searchSchema = z.object({
  decision: z
    .enum(["YES", "NO", "NO_TRADE", "all"])
    .default("all")
    .catch("all"),
  confidence: z
    .enum(["high", "medium", "low", "all"])
    .default("all")
    .catch("all"),
  sort: z
    .enum(["timestamp", "confidence", "consensusPercentage"])
    .default("timestamp")
    .catch("timestamp"),
  order: z.enum(["asc", "desc"]).default("desc").catch("desc"),
  page: z.coerce.number().default(1).catch(1),
});

export const Route = createFileRoute("/dashboard/trades")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: search }) => {
    // Prefetch signals and stats data
    await Promise.allSettled([
      queryClient.ensureQueryData({
        ...signalsQueries.paginated({
          limit: 50,
          onlyHighConfidence: search.confidence === "high",
          decision: search.decision !== "all" ? search.decision : undefined,
        }),
        revalidateIfStale: true,
      }),
      queryClient.ensureQueryData({
        ...signalsQueries.stats(),
        revalidateIfStale: true,
      }),
    ]);
    return {};
  },
  component: TradesLayout,
});

function TradesLayout() {
  return <Outlet />;
}
