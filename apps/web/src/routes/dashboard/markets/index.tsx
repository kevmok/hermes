import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "backend/convex/_generated/api";
import { DataTable } from "../-components/data-table";
import { marketColumns } from "../-components/market-columns";
import { StatsCards } from "../-components/stats-cards";
import { MarketDetailModal } from "../-components/market-detail-modal";

export const Route = createFileRoute("/dashboard/markets/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.markets.listActiveMarkets, { limit: 100, sortBy: "volume" })
    );
    await context.queryClient.ensureQueryData(
      convexQuery(api.insights.getLatestInsights, { limit: 50, onlyHighConfidence: true })
    );
  },
  component: MarketsPage,
});

function MarketsPage() {
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);

  const { data: markets, isLoading: marketsLoading } = useQuery(
    convexQuery(api.markets.listActiveMarkets, { limit: 100, sortBy: "volume" })
  );

  const { data: highConfidenceInsights, isLoading: insightsLoading } = useQuery(
    convexQuery(api.insights.getLatestInsights, { limit: 50, onlyHighConfidence: true })
  );

  const isLoading = marketsLoading || insightsLoading;

  // Calculate stats
  const totalMarkets = markets?.length ?? 0;
  const totalVolume24h = markets?.reduce((sum, m) => sum + m.volume24h, 0) ?? 0;
  const highConfidenceCount = highConfidenceInsights?.length ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground">
          Track real-time prediction market data and AI-powered insights.
        </p>
      </div>

      <StatsCards
        totalMarkets={totalMarkets}
        highConfidenceInsights={highConfidenceCount}
        totalVolume24h={totalVolume24h}
        isLoading={isLoading}
      />

      <DataTable
        columns={marketColumns}
        data={markets ?? []}
        searchKey="title"
        searchPlaceholder="Search markets..."
        isLoading={marketsLoading}
        onRowClick={(market) => setSelectedMarketId(market._id)}
      />

      <MarketDetailModal
        marketId={selectedMarketId}
        open={!!selectedMarketId}
        onOpenChange={(open) => !open && setSelectedMarketId(null)}
      />
    </div>
  );
}
