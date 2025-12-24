import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
  LinkSquare01Icon,
  Clock01Icon,
  Dollar01Icon,
} from "@hugeicons/core-free-icons";
import type { Id } from "backend/convex/_generated/dataModel";

interface SignalDetailModalProps {
  signalId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const decisionConfig = {
  YES: {
    icon: ArrowUp01Icon,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  NO: {
    icon: ArrowDown01Icon,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  NO_TRADE: {
    icon: MinusSignIcon,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
};

export function SignalDetailModal({
  signalId,
  open,
  onOpenChange,
}: SignalDetailModalProps) {
  const { data: signalData, isLoading } = useQuery({
    ...convexQuery(api.signals.getSignalWithPredictions, {
      signalId: signalId as Id<"signals">,
    }),
    enabled: !!signalId && open,
  });

  if (!signalId) return null;

  const config = signalData
    ? decisionConfig[signalData.consensusDecision]
    : decisionConfig.NO_TRADE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !signalData ? (
          <div className="py-12 text-center text-muted-foreground">
            Loading signal details...
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg leading-tight pr-8">
                {signalData.market?.title ?? "Unknown Market"}
              </DialogTitle>
            </DialogHeader>

            {/* Consensus Decision */}
            <div className="flex items-center gap-4 py-4">
              <div
                className={`flex items-center justify-center w-20 h-20 rounded-xl ${config.bgColor} border border-sidebar-border`}
              >
                <div className="text-center">
                  <HugeiconsIcon
                    icon={config.icon}
                    size={32}
                    className={config.color}
                  />
                  <span className={`text-sm font-bold ${config.color}`}>
                    {signalData.consensusDecision.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {signalData.consensusPercentage.toFixed(0)}% consensus
                  </Badge>
                  <Badge
                    variant={
                      signalData.confidenceLevel === "high"
                        ? "default"
                        : signalData.confidenceLevel === "medium"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {signalData.confidenceLevel} confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {signalData.agreeingModels} of {signalData.totalModels} models
                  agreed
                </p>
              </div>
            </div>

            <Separator />

            {/* Trigger Trade Details */}
            <div className="py-4">
              <h3 className="text-sm font-semibold mb-3">Trigger Trade</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Dollar01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-sm">
                    ${signalData.triggerTrade.size.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={
                      signalData.triggerTrade.side === "YES"
                        ? ArrowUp01Icon
                        : ArrowDown01Icon
                    }
                    size={16}
                    className={
                      signalData.triggerTrade.side === "YES"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  />
                  <span className="text-sm">
                    {signalData.triggerTrade.side} at{" "}
                    {(signalData.triggerTrade.price * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={16}
                    className="text-muted-foreground"
                  />
                  <span className="text-sm">
                    {new Date(signalData.triggerTrade.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Price at trigger:
                  </span>
                  <span className="text-sm font-medium">
                    {(signalData.priceAtTrigger * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Individual Model Predictions */}
            {signalData.predictions && signalData.predictions.length > 0 && (
              <>
                <div className="py-4">
                  <h3 className="text-sm font-semibold mb-3">Model Predictions</h3>
                  <div className="space-y-3">
                    {signalData.predictions.map((prediction) => {
                      const predConfig = decisionConfig[prediction.decision];
                      return (
                        <div
                          key={prediction._id}
                          className={`p-3 rounded-lg border ${predConfig.bgColor} border-sidebar-border`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {prediction.modelName}
                            </span>
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={predConfig.icon}
                                size={16}
                                className={predConfig.color}
                              />
                              <span className={`font-semibold ${predConfig.color}`}>
                                {prediction.decision}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {prediction.reasoning}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{prediction.responseTimeMs}ms</span>
                            {prediction.confidence && (
                              <span>{prediction.confidence}% confidence</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Full Reasoning */}
            <div className="py-4">
              <h3 className="text-sm font-semibold mb-3">Aggregated Reasoning</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {signalData.aggregatedReasoning}
              </p>
            </div>

            {/* Actions */}
            <DialogFooter>
              {signalData.market && (
                <Button
                  className="flex-1"
                  render={
                    <a
                      href={`https://polymarket.com/event/${signalData.market.eventSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Trade on Polymarket
                      <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="ml-2" />
                    </a>
                  }
                />
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
