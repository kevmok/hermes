import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "backend/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Notification01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";

export function NotificationsBell() {
  // Get user's last seen timestamp
  const { data: user } = useQuery(convexQuery(api.users.getCurrentUser, {}));

  // Get signals since last seen
  const { data: newSignals } = useQuery({
    ...convexQuery(api.signals.getSignalsSince, {
      since: user?.lastSeenSignalsAt ?? 0,
      limit: 10,
    }),
    enabled: !!user,
  });

  const { mutate: markSeen } = useMutation({
    mutationFn: useConvexMutation(api.users.updateLastSeenSignals),
  });

  const unreadCount = newSignals?.length ?? 0;

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      // Mark as seen when dropdown opens
      markSeen({});
    }
  };

  const getDecisionIcon = (decision: "YES" | "NO" | "NO_TRADE") => {
    switch (decision) {
      case "YES":
        return {
          icon: ArrowUp01Icon,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
        };
      case "NO":
        return {
          icon: ArrowDown01Icon,
          color: "text-red-400",
          bg: "bg-red-500/10",
        };
      default:
        return {
          icon: MinusSignIcon,
          color: "text-yellow-400",
          bg: "bg-yellow-500/10",
        };
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <HugeiconsIcon icon={Notification01Icon} size={20} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="font-semibold">New Signals</h3>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} new signal${unreadCount > 1 ? "s" : ""}`
              : "No new signals"}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {!newSignals || newSignals.length === 0 ? (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No new signals to show
            </div>
          ) : (
            newSignals.map((signal) => {
              const decisionStyle = getDecisionIcon(signal.consensusDecision);
              return (
                <Link
                  key={signal._id}
                  to="/dashboard/trades"
                  className="flex items-start gap-3 px-3 py-2 hover:bg-muted transition-colors"
                >
                  <div
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${decisionStyle.bg}`}
                  >
                    <HugeiconsIcon
                      icon={decisionStyle.icon}
                      size={16}
                      className={decisionStyle.color}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {signal.market?.title ?? "Unknown Market"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {signal.consensusDecision.replace("_", " ")} &bull;{" "}
                      {signal.consensusPercentage.toFixed(0)}% consensus
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {newSignals && newSignals.length > 0 && (
          <div className="px-3 py-2 border-t border-border">
            <Link
              to="/dashboard/trades"
              className="text-sm text-primary hover:underline"
            >
              View all signals &rarr;
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
