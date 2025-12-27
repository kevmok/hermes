import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { signalsQueries } from '@/lib/queries';
import { signalColumns, type Signal } from './signal-columns';
import { DataEmpty, DataError } from '@/components/ui/data-states';
import { Activity03Icon } from '@hugeicons/core-free-icons';

interface SearchFilters {
  decision: 'YES' | 'NO' | 'NO_TRADE' | 'all';
  confidence: 'high' | 'medium' | 'low' | 'all';
  sort: 'timestamp' | 'confidence' | 'consensusPercentage';
  order: 'asc' | 'desc';
  page: number;
}

interface SignalsTableProps {
  filters: SearchFilters;
  onRowClick: (signalId: string) => void;
}

export function SignalsTable({ filters, onRowClick }: SignalsTableProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const {
    data: signalsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    signalsQueries.paginated({
      limit: 50,
      onlyHighConfidence: filters.confidence === 'high',
      decision: filters.decision !== 'all' ? filters.decision : undefined,
    }),
  );

  const data = React.useMemo(() => {
    const items = signalsData?.items ?? [];
    // Client-side filtering for confidence levels other than 'high'
    if (filters.confidence !== 'all' && filters.confidence !== 'high') {
      return items.filter((s: Signal) => s.confidenceLevel === filters.confidence);
    }
    return items;
  }, [signalsData?.items, filters.confidence]);

  const table = useReactTable({
    data,
    columns: signalColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
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

  const handleDecisionChange = (value: string | null) => {
    if (value) {
      navigate({
        to: '/dashboard/trades',
        search: { ...filters, decision: value as SearchFilters['decision'] },
      });
    }
  };

  const handleConfidenceChange = (value: string | null) => {
    if (value) {
      navigate({
        to: '/dashboard/trades',
        search: { ...filters, confidence: value as SearchFilters['confidence'] },
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
      <DataError
        message="Failed to load signals"
        onRetry={() => refetch()}
      />
    );
  }

  if (!data.length) {
    return (
      <DataEmpty
        title="No signals yet"
        description="AI signals will appear here when whale trades trigger analysis."
        icon={Activity03Icon}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search markets..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm bg-sidebar border-sidebar-border"
        />
        <Select
          value={filters.decision}
          onValueChange={handleDecisionChange}
          items={{ all: 'All Decisions', YES: 'YES', NO: 'NO', NO_TRADE: 'NO TRADE' }}
        >
          <SelectTrigger className="w-[140px] bg-sidebar border-sidebar-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Decisions</SelectItem>
            <SelectItem value="YES">YES</SelectItem>
            <SelectItem value="NO">NO</SelectItem>
            <SelectItem value="NO_TRADE">NO TRADE</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.confidence}
          onValueChange={handleConfidenceChange}
          items={{ all: 'All Confidence', high: 'High', medium: 'Medium', low: 'Low' }}
        >
          <SelectTrigger className="w-[140px] bg-sidebar border-sidebar-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-sidebar-border overflow-hidden">
        <Table>
          <TableHeader className="bg-sidebar/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-sidebar-border hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-sidebar-border hover:bg-sidebar/30 cursor-pointer"
                  onClick={() => onRowClick(row.original._id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={signalColumns.length} className="h-24 text-center text-muted-foreground">
                  No signals found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} signals
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
