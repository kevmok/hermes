import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { eventsQueries } from "@/lib/queries";
import { queryClient } from "@/lib/providers/query";
import { EventDetailContent } from "./-components/event-detail-content";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/events/$eventId")({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData({
      ...eventsQueries.withMarkets(params.eventId),
      revalidateIfStale: true,
    });
    return {};
  },
  component: EventDetailRoute,
});

function EventDetailRoute() {
  const { eventId } = Route.useParams();

  const {
    data: event,
    isLoading,
    error,
  } = useQuery(eventsQueries.withMarkets(eventId));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Event not found</p>
        <Link
          to="/dashboard/events"
          className="text-amber-400 hover:text-amber-300 text-sm"
        >
          Back to events
        </Link>
      </div>
    );
  }

  return <EventDetailContent event={event} />;
}
