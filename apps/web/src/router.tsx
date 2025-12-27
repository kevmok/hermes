// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { createRouter } from '@tanstack/react-router';
import { queryClient, convexQueryClient } from '@/lib/providers/query';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: { queryClient, convexQueryClient },
    // defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    handleRedirects: true,
    wrapQueryClient: true,
  });

  return router;
};
