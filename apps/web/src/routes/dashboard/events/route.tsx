import { createFileRoute, Outlet, useNavigate, useMatch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { eventsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import { EventsTable } from './-components/events-table';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Calendar03Icon,
  Activity03Icon,
  ChartLineData01Icon,
  MoneyBag02Icon,
} from '@hugeicons/core-free-icons';

// Search params schema with zod validation
const searchSchema = z.object({
  sortBy: z.enum(['recent', 'volume', 'signals']).default('recent').catch('recent'),
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

  const { data: stats, isLoading: statsLoading } = useQuery(eventsQueries.stats());

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-amber-500/10">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/40 via-orange-950/30 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(245, 158, 11, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.3) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-lg shadow-amber-500/10">
                    <HugeiconsIcon
                      icon={Calendar03Icon}
                      size={24}
                      className="text-amber-400"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
                    Tracked Events
                  </h1>
                  <p className="text-sm text-amber-300/60 font-mono">
                    WHALE ACTIVITY DETECTED
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground max-w-lg">
                Events with whale trades captured from our WebSocket feed.
                Click to see markets and AI signals.
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total Events"
              value={stats?.totalEvents ?? 0}
              icon={Calendar03Icon}
              gradient="from-amber-500 to-orange-500"
              isLoading={statsLoading}
            />
            <StatCard
              label="Active Events"
              value={stats?.activeEvents ?? 0}
              icon={Activity03Icon}
              gradient="from-cyan-500 to-blue-500"
              isLoading={statsLoading}
            />
            <StatCard
              label="Total Trades"
              value={stats?.totalTrades ?? 0}
              icon={ChartLineData01Icon}
              gradient="from-purple-500 to-pink-500"
              isLoading={statsLoading}
            />
            <StatCard
              label="Total Volume"
              value={formatVolume(stats?.totalVolume ?? 0)}
              icon={MoneyBag02Icon}
              gradient="from-emerald-500 to-teal-500"
              isLoading={statsLoading}
              highlight
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <EventsTable filters={search} onRowClick={handleRowClick} />
      </div>

      {/* Event Detail Drawer */}
      <Sheet open={!!childMatch} onOpenChange={(open) => !open && handleDrawerClose()}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto p-0">
          <Outlet />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Helper components
interface StatCardProps {
  label: string;
  value: number | string;
  icon: typeof Activity03Icon;
  gradient: string;
  isLoading?: boolean;
  highlight?: boolean;
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  isLoading,
  highlight,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />
      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${gradient} opacity-50`}
      />

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
            {label}
          </span>
          <div
            className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} opacity-80`}
          >
            <HugeiconsIcon icon={Icon} size={12} className="text-white" />
          </div>
        </div>

        {isLoading ? (
          <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
        ) : (
          <span
            className={`text-2xl font-bold tabular-nums tracking-tight ${highlight ? 'text-emerald-400' : 'text-white'}`}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function formatVolume(volume: number | undefined | null): string {
  if (volume == null || Number.isNaN(volume)) return '$0';
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}
