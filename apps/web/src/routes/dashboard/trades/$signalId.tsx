import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { signalsQueries } from '@/lib/queries';
import { queryClient } from '@/lib/providers/query';
import type { Id } from 'backend/convex/_generated/dataModel';
import { SignalDetailContent } from './-components/signal-detail-content';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/dashboard/trades/$signalId')({
  loader: async ({ params }) => {
    await queryClient.ensureQueryData({
      ...signalsQueries.withPredictions(params.signalId as Id<'signals'>),
      revalidateIfStale: true,
    });
    return {};
  },
  component: SignalDetailRoute,
});

function SignalDetailRoute() {
  const { signalId } = Route.useParams();

  const {
    data: signal,
    isLoading,
    error,
  } = useQuery(signalsQueries.withPredictions(signalId as Id<'signals'>));

  if (isLoading) {
    return (
      <div className='p-6 space-y-6'>
        <Skeleton className='h-8 w-3/4' />
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-32 w-full' />
        <Skeleton className='h-48 w-full' />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className='p-6 flex flex-col items-center justify-center h-full'>
        <p className='text-muted-foreground mb-4'>Signal not found</p>
        <Link
          to='/dashboard/trades'
          className='text-cyan-400 hover:text-cyan-300 text-sm'
        >
          Back to signals
        </Link>
      </div>
    );
  }

  return <SignalDetailContent signal={signal} />;
}
