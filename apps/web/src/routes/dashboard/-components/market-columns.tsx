import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon, ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";

// Type based on Convex schema
interface Market {
  _id: string;
  _creationTime: number;
  polymarketId: string;
  eventSlug: string;
  title: string;
  description?: string;
  category?: string;
  currentYesPrice: number;
  currentNoPrice: number;
  volume24h: number;
  totalVolume: number;
  isActive: boolean;
  endDate?: number;
  lastTradeAt: number;
  lastAnalyzedAt?: number;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
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
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-[400px]">
        <p className="font-medium truncate">{row.getValue("title")}</p>
        {row.original.category && (
          <p className="text-xs text-muted-foreground mt-0.5">{row.original.category}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "currentYesPrice",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        YES Price
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => {
      const price = row.getValue("currentYesPrice") as number;
      const percentage = (price * 100).toFixed(0);
      const isHigh = price > 0.5;

      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={isHigh ? ArrowUp01Icon : ArrowDown01Icon}
            size={14}
            className={isHigh ? "text-emerald-500" : "text-red-500"}
          />
          <span className={isHigh ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
            {percentage}%
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "volume24h",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        24h Volume
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => {
      const volume = row.getValue("volume24h") as number;
      return <span className="text-muted-foreground">{formatVolume(volume)}</span>;
    },
  },
  {
    accessorKey: "totalVolume",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Total Volume
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => {
      const volume = row.getValue("totalVolume") as number;
      return <span className="text-muted-foreground">{formatVolume(volume)}</span>;
    },
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
        <HugeiconsIcon icon={ArrowUpDownIcon} size={14} className="ml-2 opacity-50" />
      </Button>
    ),
    cell: ({ row }) => {
      const timestamp = row.getValue("lastTradeAt") as number;
      return <span className="text-muted-foreground text-sm">{formatTimeAgo(timestamp)}</span>;
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Closed"}
        </Badge>
      );
    },
  },
];
