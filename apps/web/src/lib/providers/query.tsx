import { QueryClient } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "../env/client";

const convexQueryClient = new ConvexQueryClient(env.VITE_CONVEX_URL, {
  expectAuth: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
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
