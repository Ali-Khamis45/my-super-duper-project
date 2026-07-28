import { QueryClient, isServer } from "@tanstack/react-query";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per request on the server; a stable singleton in the browser
 * so Suspense boundaries don't refetch on every re-render.
 */
export function getQueryClient() {
  if (isServer) {
    return createQueryClient();
  }
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}
