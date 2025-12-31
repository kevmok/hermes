import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsQueries } from "@/lib/queries";
import { eventColumns, type TrackedEvent } from "./event-columns";
import { DataEmpty, DataError } from "@/components/ui/data-states";
import { Calendar03Icon } from "@hugeicons/core-free-icons";

interface SearchFilters {
  sortBy: "recent" | "volume" | "signals";
  activeOnly: boolean;
  page: number;
}

interface EventsTableProps {
  filters: SearchFilters;
  onRowClick: (eventSlug: string) => void;
}

export function EventsTable({ filters, onRowClick }: EventsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery(eventsQueries.withSignals(50));

  const data = React.useMemo(() => {
    let events = eventsData ?? [];

    // Apply client-side filters
    if (filters.activeOnly) {
      events = events.filter((e: TrackedEvent) => e.isActive);
    }

    // Apply client-side sorting
    if (filters.sortBy === "volume") {
      events = [...events].sort((a, b) => b.totalVolume - a.totalVolume);
    } else if (filters.sortBy === "signals") {
      events = [...events].sort((a, b) => b.signalCount - a.signalCount);
    } else {
      events = [...events].sort((a, b) => b.lastTradeAt - a.lastTradeAt);
    }

    return events;
  }, [eventsData, filters.activeOnly, filters.sortBy]);

  const table = useReactTable({
    data,
    columns: eventColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const handleSortChange = (value: string | null) => {
    if (value) {
      navigate({
        to: "/dashboard/events",
        search: { ...filters, sortBy: value as SearchFilters["sortBy"] },
      });
    }
  };

  const handleActiveOnlyChange = (value: string | null) => {
    if (value) {
      navigate({
        to: "/dashboard/events",
        search: { ...filters, activeOnly: value === "active" },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-lg border border-sidebar-border overflow-hidden">
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <DataError message="Failed to load events" onRetry={() => refetch()} />
    );
  }

  if (!data.length) {
    return (
      <DataEmpty
        title="No events tracked yet"
        description="Events will appear here when whale trades are captured. Start the WebSocket collector to track live activity."
        icon={Calendar03Icon}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search events..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm bg-sidebar border-sidebar-border"
        />
        <Select
          value={filters.sortBy}
          onValueChange={handleSortChange}
          items={{
            recent: "Most Recent",
            volume: "Volume",
            signals: "Signals",
          }}
        >
          <SelectTrigger className="w-[140px] bg-sidebar border-sidebar-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="volume">Volume</SelectItem>
            <SelectItem value="signals">Signals</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.activeOnly ? "active" : "all"}
          onValueChange={handleActiveOnlyChange}
          items={{ all: "All Events", active: "Active Only" }}
        >
          <SelectTrigger className="w-[140px] bg-sidebar border-sidebar-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-sidebar-border overflow-hidden">
        <Table>
          <TableHeader className="bg-sidebar/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-sidebar-border hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="border-sidebar-border hover:bg-sidebar/30 cursor-pointer"
                  onClick={() => onRowClick(row.original.eventSlug)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={eventColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No events found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} events
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-sidebar-border"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-sidebar-border"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
