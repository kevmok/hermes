import {
  createFileRoute,
  Outlet,
  useNavigate,
  useMatch,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { eventsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import { EventsTable } from './-components/events-table';
import { StatCard } from '../-components/stat-card';
import {
  Calendar03Icon,
  Activity03Icon,
  ChartLineData01Icon,
  MoneyBag02Icon,
} from '@hugeicons/core-free-icons';

// Search params schema with zod validation
const searchSchema = z.object({
  sortBy: z
    .enum(['recent', 'volume', 'signals'])
    .default('recent')
    .catch('recent'),
  activeOnly: z.boolean().default(false).catch(false),
  page: z.coerce.number().default(1).catch(1),
});

export const Route = createFileRoute('/dashboard/events')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async () => {
    // Prefetch events and stats data
    await Promise.all([
      queryClient.ensureQueryData({
        ...eventsQueries.withSignals(50),
        revalidateIfStale: true,
      }),
      queryClient.ensureQueryData({
        ...eventsQueries.stats(),
        revalidateIfStale: true,
      }),
    ]);
    return {};
  },
  component: EventsLayout,
});

function EventsLayout() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Check if child route (drawer) is active
  const childMatch = useMatch({
    from: '/dashboard/events/$eventId',
    shouldThrow: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery(
    eventsQueries.stats(),
  );

  const handleDrawerClose = () => {
    navigate({ to: '/dashboard/events', search });
  };

  const handleRowClick = (eventSlug: string) => {
    navigate({
      to: '/dashboard/events/$eventId',
      params: { eventId: eventSlug },
      search,
    });
  };

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-6 md:px-6 md:py-8">
          {/* Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Events
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg">
                Events with whale trades captured from our WebSocket feed. 
                Click to see markets and signals.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard
              label="Total Events"
              value={stats?.totalEvents?.toLocaleString() ?? '0'}
              icon={Calendar03Icon}
              variant="warning"
              isLoading={statsLoading}
            />
            <StatCard
              label="Active Events"
              value={stats?.activeEvents?.toLocaleString() ?? '0'}
              icon={Activity03Icon}
              isLoading={statsLoading}
            />
            <StatCard
              label="Total Trades"
              value={stats?.totalTrades?.toLocaleString() ?? '0'}
              icon={ChartLineData01Icon}
              isLoading={statsLoading}
            />
            <StatCard
              label="Total Volume"
              value={formatVolume(stats?.totalVolume ?? 0)}
              icon={MoneyBag02Icon}
              variant="success"
              isLoading={statsLoading}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        <EventsTable filters={search} onRowClick={handleRowClick} />
      </div>

      {/* Event Detail Drawer */}
      <Sheet
        open={!!childMatch}
        onOpenChange={(open) => !open && handleDrawerClose()}
      >
        <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto p-0">
          <Outlet />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || Number.isNaN(volume)) return '$0';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}
