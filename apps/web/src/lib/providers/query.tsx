import { QueryClient } from '@tanstack/react-query';
import { ConvexQueryClient } from '@convex-dev/react-query';
import { env } from '../env/client';

const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL, {
  expectAuth: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      refetchOnWindowFocus: false,
      // Default stale time of 30s - real-time data stays fresh, but allows loader prefetching
      staleTime: 1000 * 30,
      // Allow background refetch when data is stale
      refetchOnMount: 'always',
    },
  },
  // queryCache: new QueryCache({
  //   onError: (error) => {
  //     toast.error(`Error: ${error.message}`, {
  //       action: {
  //         label: "retry",
  //         onClick: () => {
  //           queryClient.invalidateQueries();
  //         },
  //       },
  //     });
  //   },
  // }),
});
convexQueryClient.connect(queryClient);

export { convexQueryClient, queryClient };
