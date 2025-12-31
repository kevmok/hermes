import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { useConvexMutation, convexQuery } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  Add01Icon,
  Loading03Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  MinusSignIcon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/portfolio/")({
  component: PortfolioPage,
});

type Alignment = "aligned" | "opposed" | "no_signal";

interface PositionWithSignal {
  position: {
    conditionId?: string;
    title?: string;
    outcome?: string;
    size?: number;
    avgPrice?: number;
    currentValue?: number;
    percentPnl?: number;
  };
  signal?: {
    consensusDecision: string;
    consensusPercentage: number;
  };
  alignment: Alignment;
}

function PortfolioPage() {
  const { data: portfolios, isLoading: loadingPortfolios } = useQuery(
    convexQuery(api.portfolio.getMyPortfolios, {}),
  );

  const addPortfolioMutation = useConvexMutation(api.portfolio.addPortfolio);
  const removePortfolioMutation = useConvexMutation(
    api.portfolio.removePortfolio,
  );
  const syncPositions = useAction(api.portfolio.syncPortfolioWithSignals);

  const [newAddress, setNewAddress] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionWithSignal[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncedAddress, setSyncedAddress] = useState<string | null>(null);

  const handleAddAddress = async () => {
    if (!newAddress) return;
    setAddError(null);
    try {
      await addPortfolioMutation({ polymarketAddress: newAddress });
      setNewAddress("");
    } catch (error) {
      setAddError(
        error instanceof Error ? error.message : "Failed to add wallet",
      );
    }
  };

  const handleRemove = async (portfolioId: string) => {
    try {
      await removePortfolioMutation({ portfolioId: portfolioId as any });
      if (syncedAddress) {
        setPositions([]);
        setSyncedAddress(null);
      }
    } catch (error) {
      console.error("Failed to remove:", error);
    }
  };

  const handleSync = async (address: string) => {
    setSyncing(true);
    setSyncedAddress(address);
    try {
      const result = await syncPositions({ address });
      setPositions(result as PositionWithSignal[]);
    } catch (error) {
      console.error("Sync failed:", error);
      setPositions([]);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                My Positions
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect your Polymarket wallet to see how your positions align
                with AI signals
              </p>
            </div>
          </div>

          <div className="flex gap-2 max-w-lg">
            <Input
              placeholder="0x..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <Button onClick={handleAddAddress} disabled={!newAddress}>
              <HugeiconsIcon icon={Add01Icon} size={16} className="mr-2" />
              Add Wallet
            </Button>
          </div>
          {addError && (
            <p className="text-sm text-destructive mt-2">{addError}</p>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {loadingPortfolios ? (
          <div className="flex items-center justify-center py-12">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : portfolios && portfolios.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {portfolios.map((p) => (
                <div key={p._id} className="flex items-center gap-1">
                  <Button
                    variant={
                      syncedAddress === p.polymarketAddress
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleSync(p.polymarketAddress)}
                    disabled={syncing}
                  >
                    <HugeiconsIcon
                      icon={Wallet01Icon}
                      size={14}
                      className="mr-2"
                    />
                    {p.nickname ||
                      `${p.polymarketAddress.slice(0, 6)}...${p.polymarketAddress.slice(-4)}`}
                    {syncing && syncedAddress === p.polymarketAddress && (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        size={14}
                        className="ml-2 animate-spin"
                      />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(p._id)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={14} />
                  </Button>
                </div>
              ))}
            </div>

            {positions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{positions.length} positions found</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {
                      positions.filter((p) => p.alignment === "aligned").length
                    }{" "}
                    aligned
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {
                      positions.filter((p) => p.alignment === "opposed").length
                    }{" "}
                    opposed
                  </span>
                </div>

                {positions.map((item, i) => (
                  <PositionCard key={i} {...item} />
                ))}
              </div>
            ) : syncedAddress && !syncing ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No open positions found for this wallet
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <HugeiconsIcon
                icon={Wallet01Icon}
                size={48}
                className="mx-auto text-muted-foreground mb-4"
              />
              <p className="text-muted-foreground">
                Add a Polymarket wallet address to see your positions
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Note: We can only see your current positions. Position alignment shows
          whether your holdings match our latest AI consensus.
        </p>
      </div>
    </div>
  );
}

function PositionCard({ position, signal, alignment }: PositionWithSignal) {
  const alignmentConfig = {
    aligned: {
      icon: CheckmarkCircle01Icon,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
      label: "Aligned with Signal",
    },
    opposed: {
      icon: AlertCircleIcon,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
      label: "Opposes Signal",
    },
    no_signal: {
      icon: MinusSignIcon,
      color: "text-muted-foreground",
      bg: "bg-muted",
      label: "No Signal",
    },
  }[alignment];

  const pnl = position.percentPnl ?? 0;
  const pnlColor =
    pnl >= 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">
              {position.title || "Unknown Market"}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={position.outcome === "Yes" ? "default" : "secondary"}
              >
                {position.outcome || "Unknown"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {(position.size ?? 0).toFixed(0)} shares @ $
                {(position.avgPrice ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className={`font-mono font-bold ${pnlColor}`}>
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              ${(position.currentValue ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div
          className={`mt-3 p-2 rounded-md ${alignmentConfig.bg} flex items-center gap-2`}
        >
          <HugeiconsIcon
            icon={alignmentConfig.icon}
            size={16}
            className={alignmentConfig.color}
          />
          <span className={`text-sm ${alignmentConfig.color}`}>
            {alignmentConfig.label}
          </span>
          {signal && (
            <span className="text-xs text-muted-foreground ml-auto">
              Signal: {signal.consensusDecision} (
              {signal.consensusPercentage.toFixed(0)}
              %)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
