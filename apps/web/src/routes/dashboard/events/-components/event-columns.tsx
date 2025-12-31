import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpDownIcon, Activity03Icon } from "@hugeicons/core-free-icons";

// Event type matching the backend response
export interface TrackedEvent {
  _id: string;
  _creationTime: number;
  eventSlug: string;
  title: string;
  imageUrl?: string;
  isActive: boolean;
  firstTradeAt: number;
  lastTradeAt: number;
  tradeCount: number;
  totalVolume: number;
  marketCount: number;
  signalCount: number;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

export const eventColumns: ColumnDef<TrackedEvent>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Event
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl;
      return (
        <div className="flex items-center gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover bg-white/5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="max-w-[300px]">
            <p className="font-medium truncate">{row.getValue("title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {row.original.eventSlug}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) => {
      const isActive = getValue() as boolean;
      return (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={
            isActive
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border"
              : ""
          }
        >
          {isActive ? "Active" : "Closed"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "marketCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Markets
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: "signalCount",
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
    cell: ({ getValue }) => {
      const count = getValue() as number;
      return (
        <div className="flex items-center gap-1.5">
          {count > 0 && (
            <HugeiconsIcon
              icon={Activity03Icon}
              size={14}
              className="text-cyan-400"
            />
          )}
          <span
            className={`text-sm tabular-nums ${count > 0 ? "text-cyan-400" : "text-muted-foreground"}`}
          >
            {count}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "tradeCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Trades
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: "totalVolume",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Volume
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums font-medium text-emerald-400">
        {formatVolume(getValue() as number)}
      </span>
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
        Last Activity
        <HugeiconsIcon
          icon={ArrowUpDownIcon}
          size={14}
          className="ml-2 opacity-50"
        />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">
        {formatTimeAgo(getValue() as number)}
      </span>
    ),
  },
];
