import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon, Activity03Icon } from "@hugeicons/core-free-icons";

// Type based on simplified Convex schema (no volatile price data)
export interface Market {
  _id: string;
  _creationTime: number;
  polymarketId: string;
  slug: string;
  eventSlug: string;
  title: string;
  imageUrl?: string;
  isActive: boolean;
  lastTradeAt: number;
  lastAnalyzedAt?: number;
  outcome?: "YES" | "NO" | "INVALID" | null;
  resolvedAt?: number;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export const marketColumns: ColumnDef<Market>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Market
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-[400px]">
        <p className="font-medium truncate">{row.getValue("title")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {row.original.eventSlug}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "lastTradeAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Last Trade
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue("lastTradeAt") as number;
      return (
        <span className="text-muted-foreground text-sm">
          {formatTimeAgo(timestamp)}
        </span>
      );
    },
  },
  {
    accessorKey: "lastAnalyzedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Signals
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ row }) => {
      const lastAnalyzed = row.getValue("lastAnalyzedAt") as number | undefined;
      if (!lastAnalyzed) {
        return <span className="text-muted-foreground/50 text-sm">—</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={Activity03Icon}
            size={14}
            className="text-cyan-400"
          />
          <span className="text-muted-foreground text-sm">
            {formatTimeAgo(lastAnalyzed)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      const outcome = row.original.outcome;

      if (outcome) {
        return (
          <Badge
            variant="outline"
            className={
              outcome === "YES"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : outcome === "NO"
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }
          >
            {outcome}
          </Badge>
        );
      }

      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Closed"}
        </Badge>
      );
    },
  },
];
