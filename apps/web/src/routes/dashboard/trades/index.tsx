import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { signalsQueries } from "@/lib/queries";
import { SignalsTable } from "./-components/signals-table";
import { StatCard } from "../-components/stat-card";
import {
  Activity03Icon,
  FlashIcon,
  ChartLineData01Icon,
  PercentCircleIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/trades/")({
  component: SignalsPage,
});

function SignalsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { data: signalStats, isLoading: statsLoading } = useQuery(
    signalsQueries.stats(),
  );

  const handleRowClick = (signalId: string) => {
    navigate({
      to: "/dashboard/trades/$signalId",
      params: { signalId },
    });
  };

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Signals
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Consensus signals generated from whale trades. High confidence
                signals have{" "}
                <span className="text-primary font-medium">80%+</span> model
                agreement.
              </p>
            </div>
          </div>

          {/* Stats Grid - Mobile: 2 cols, Desktop: 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              label="Total Signals"
              value={signalStats?.totalSignals?.toLocaleString() ?? "0"}
              icon={Activity03Icon}
              isLoading={statsLoading}
            />
            <StatCard
              label="High Confidence"
              value={
                signalStats?.highConfidenceSignals?.toLocaleString() ?? "0"
              }
              icon={FlashIcon}
              variant="success"
              isLoading={statsLoading}
            />
            <StatCard
              label="Last 24h"
              value={signalStats?.signalsLast24h?.toString() ?? "0"}
              icon={ChartLineData01Icon}
              isLoading={statsLoading}
            />
            <StatCard
              label="High Conf Rate"
              value={`${(signalStats?.highConfidencePercentage ?? 0).toFixed(0)}%`}
              icon={PercentCircleIcon}
              isLoading={statsLoading}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Table */}
      <div className="p-4 md:p-6">
        <SignalsTable filters={search} onRowClick={handleRowClick} />
      </div>
    </div>
  );
}
