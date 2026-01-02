import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { smartTriggersQueries } from "@/lib/queries";
import { queryClient } from "@/lib/providers/query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  ChartLineData01Icon,
  Clock01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/dashboard/alerts/")({
  loader: async () => {
    await queryClient.ensureQueryData({
      ...smartTriggersQueries.topTriggers(20),
      revalidateIfStale: true,
    });
    return {};
  },
  component: SmartAlertsPage,
});

function SmartAlertsPage() {
  const { data: triggers, isLoading } = useQuery(
    smartTriggersQueries.topTriggers(20),
  );

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                <HugeiconsIcon
                  icon={FlashIcon}
                  size={28}
                  className="text-amber-500"
                />
                Smart Alerts
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Automated opportunity detection based on price movements,
                contrarian whale trades, and resolution proximity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <TriggerTypeCard
              label="Price Movements"
              description="10%+ swings in 4 hours"
              icon={ChartLineData01Icon}
              count={
                triggers?.filter((t) => t.triggerType === "price_movement")
                  .length ?? 0
              }
              isLoading={isLoading}
            />
            <TriggerTypeCard
              label="Contrarian Whales"
              description="Smart money vs. consensus"
              icon={AlertCircleIcon}
              count={
                triggers?.filter((t) => t.triggerType === "contrarian_whale")
                  .length ?? 0
              }
              isLoading={isLoading}
              variant="warning"
            />
            <TriggerTypeCard
              label="Resolution Soon"
              description="High conviction, near resolve"
              icon={Clock01Icon}
              count={
                triggers?.filter((t) => t.triggerType === "resolution_proximity")
                  .length ?? 0
              }
              isLoading={isLoading}
              variant="info"
            />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : !triggers || triggers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <TriggerCard key={trigger._id} trigger={trigger} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TriggerTypeCard({
  label,
  description,
  icon,
  count,
  isLoading,
  variant = "default",
}: {
  label: string;
  description: string;
  icon: typeof FlashIcon;
  count: number;
  isLoading: boolean;
  variant?: "default" | "warning" | "info";
}) {
  const variantStyles = {
    default: "text-emerald-400",
    warning: "text-amber-400",
    info: "text-cyan-400",
  };

  return (
    <Card className="bg-card/50 border-white/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-white/5 ${variantStyles[variant]}`}
          >
            <HugeiconsIcon icon={icon} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {label}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {description}
            </p>
          </div>
          <div className="text-right">
            {isLoading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <span className="text-2xl font-bold text-foreground">{count}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TriggerCard({ trigger }: { trigger: any }) {
  const typeConfig = {
    price_movement: {
      icon: trigger.priceMovement?.direction === "up" ? ArrowUp01Icon : ArrowDown01Icon,
      label: "Price Movement",
      badgeClass:
        trigger.priceMovement?.direction === "up"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20",
    },
    contrarian_whale: {
      icon: AlertCircleIcon,
      label: "Contrarian Whale",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    resolution_proximity: {
      icon: Clock01Icon,
      label: "Resolution Soon",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    },
  };

  const config = typeConfig[trigger.triggerType as keyof typeof typeConfig];

  return (
    <Card className="bg-card border-white/5 hover:border-white/10 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="p-3 rounded-xl bg-white/5 shrink-0">
              <HugeiconsIcon
                icon={config.icon}
                size={24}
                className="text-foreground"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={config.badgeClass}>
                  {config.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-white/5 text-muted-foreground border-white/10"
                >
                  Score: {trigger.score.toFixed(0)}
                </Badge>
              </div>
              <Link
                to="/dashboard/events/$eventId"
                params={{ eventId: trigger.market?.eventSlug ?? "" }}
                className="block"
              >
                <h3 className="font-semibold text-foreground line-clamp-2 hover:text-amber-400 transition-colors">
                  {trigger.market?.title ?? "Unknown Market"}
                </h3>
              </Link>
              <TriggerDetails trigger={trigger} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">
              {formatRelativeTime(trigger.createdAt)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Expires {formatRelativeTime(trigger.expiresAt)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TriggerDetails({ trigger }: { trigger: any }) {
  if (trigger.triggerType === "price_movement" && trigger.priceMovement) {
    const pm = trigger.priceMovement;
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Price moved{" "}
        <span
          className={
            pm.direction === "up" ? "text-emerald-400" : "text-red-400"
          }
        >
          {pm.direction === "up" ? "+" : "-"}
          {(pm.magnitude * 100).toFixed(1)}%
        </span>{" "}
        from {(pm.startPrice * 100).toFixed(0)}% to{" "}
        {(pm.currentPrice * 100).toFixed(0)}%
      </p>
    );
  }

  if (trigger.triggerType === "contrarian_whale" && trigger.contrarianWhale) {
    const cw = trigger.contrarianWhale;
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Whale betting{" "}
        <span
          className={
            cw.whaleSide === "YES" ? "text-emerald-400" : "text-red-400"
          }
        >
          {cw.whaleSide}
        </span>{" "}
        vs. AI consensus{" "}
        <span
          className={
            cw.consensusSide === "YES" ? "text-emerald-400" : "text-red-400"
          }
        >
          {cw.consensusSide}
        </span>
        {cw.whaleWinRate && (
          <span className="text-amber-400">
            {" "}
            (Win rate: {(cw.whaleWinRate * 100).toFixed(0)}%)
          </span>
        )}
      </p>
    );
  }

  if (
    trigger.triggerType === "resolution_proximity" &&
    trigger.resolutionProximity
  ) {
    const rp = trigger.resolutionProximity;
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Price at{" "}
        <span className="text-cyan-400">
          {(rp.currentPrice * 100).toFixed(0)}%
        </span>{" "}
        ({rp.priceExtremeLevel.replace("_", " ")})
        {rp.daysUntilResolution !== undefined && (
          <span>
            {" "}
            - Resolves in{" "}
            <span className="text-amber-400">
              {rp.daysUntilResolution.toFixed(1)} days
            </span>
          </span>
        )}
      </p>
    );
  }

  return null;
}

function EmptyState() {
  return (
    <Card className="bg-card/50 border-white/5">
      <CardContent className="p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <HugeiconsIcon icon={FlashIcon} size={32} className="text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Active Alerts
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Smart alerts are automatically generated when significant price
          movements occur, whales bet against AI consensus, or markets approach
          resolution with extreme prices.
        </p>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const absDiff = Math.abs(diff);
  const future = diff < 0;

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  let timeStr: string;
  if (minutes < 1) timeStr = "just now";
  else if (minutes < 60) timeStr = `${minutes}m`;
  else if (hours < 24) timeStr = `${hours}h`;
  else timeStr = `${days}d`;

  return future ? `in ${timeStr}` : `${timeStr} ago`;
}
