import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { getQueryClient } from '@/lib/query-client';
import { routeTree } from './routeTree.gen';

export const getRouter = createRouter;

export function createRouter() {
  // Server renders must not share a user's query state with another request.
  const queryClient = getQueryClient();

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    getScrollRestorationKey: (location) => location.pathname,
    defaultPreloadStaleTime: 0,
    context: { queryClient },
    defaultPendingComponent: () => (
      <div className='flex min-h-[50dvh] flex-1 items-center justify-center'>
        <div className='border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent' />
      </div>
    ),
    defaultNotFoundComponent: () => (
      <div className='absolute top-1/2 left-1/2 mb-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center text-center'>
        <span className='from-foreground bg-linear-to-b to-transparent bg-clip-text text-[10rem] leading-none font-extrabold text-transparent'>
          404
        </span>
        <h2 className='font-heading my-2 text-2xl font-bold'>Something&apos;s missing</h2>
        <p>Sorry, the page you are looking for doesn&apos;t exist or has been moved.</p>
      </div>
    )
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
