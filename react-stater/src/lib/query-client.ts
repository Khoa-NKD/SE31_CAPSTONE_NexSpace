import { QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000
      }
    }
  });
}

// In TanStack Start SSR, the server must NEVER reuse a singleton QueryClient across requests
// to avoid cross-request data leaks and stale router subscriptions ('isDehydrated' crashes).
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient per request
    return makeQueryClient();
  }
  // Browser: keep singleton
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function setQueryClient(client: QueryClient) {
  browserQueryClient = client;
}

