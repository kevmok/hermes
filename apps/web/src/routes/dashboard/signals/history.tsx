import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalCard, type Signal } from "./-components/signal-card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity03Icon } from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/signals/history")({
  component: SignalHistoryPage,
});

type OutcomeTab = "all" | "evaluated" | "correct" | "incorrect";

function SignalHistoryPage() {
  const [tab, setTab] = useState<OutcomeTab>("all");

  const { data: signalsWithOutcomes, isLoading } = useQuery(
    convexQuery(api.performanceMetrics.getSignalsWithOutcomes, {
      limit: 100,
      onlyEvaluated: tab === "evaluated" || tab === "correct" || tab === "incorrect",
    })
  );

  const filteredSignals =
    signalsWithOutcomes?.filter((s) => {
      if (tab === "correct" && s.isCorrect !== true) return false;
      if (tab === "incorrect" && s.isCorrect !== false) return false;
      return true;
    }) ?? [];

  const counts = {
    all: signalsWithOutcomes?.length ?? 0,
    evaluated: signalsWithOutcomes?.filter((s) => s.isCorrect !== null).length ?? 0,
    correct: signalsWithOutcomes?.filter((s) => s.isCorrect === true).length ?? 0,
    incorrect: signalsWithOutcomes?.filter((s) => s.isCorrect === false).length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signal History</h1>
        <p className="text-muted-foreground mt-1">
          View past signals and track accuracy against market outcomes.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as OutcomeTab)}>
        <TabsList>
          <TabsTrigger value="all">
            All{" "}
            <Badge variant="secondary" className="ml-2">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="evaluated">
            Evaluated{" "}
            <Badge variant="secondary" className="ml-2">
              {counts.evaluated}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="correct">
            Correct{" "}
            <Badge variant="secondary" className="ml-2 text-emerald-400">
              {counts.correct}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="incorrect">
            Incorrect{" "}
            <Badge variant="secondary" className="ml-2 text-red-400">
              {counts.incorrect}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-sidebar-border bg-sidebar/50">
              <div className="p-6">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
                <Skeleton className="h-20 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredSignals.length === 0 ? (
        <Card className="border-sidebar-border bg-sidebar/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HugeiconsIcon
              icon={Activity03Icon}
              size={48}
              className="text-muted-foreground mb-4"
            />
            <p className="text-muted-foreground text-center">
              No signals found for this filter.
              <br />
              {tab === "evaluated"
                ? "Signals will appear here once markets resolve."
                : tab === "correct"
                  ? "No correct predictions yet."
                  : tab === "incorrect"
                    ? "No incorrect predictions yet."
                    : "Generate signals by detecting whale trades."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSignals.map((signal) => (
            <SignalCard
              key={signal._id}
              signal={
                {
                  ...signal,
                  market: signal.market
                    ? {
                        ...signal.market,
                        outcome: signal.outcome,
                      }
                    : null,
                } as Signal
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
