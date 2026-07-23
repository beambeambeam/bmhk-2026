import type { AppRouterClient } from "@bmhk-2026/api";
import { env } from "@bmhk-2026/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });
}

export const queryClient = createQueryClient();

function fetchWithCredentials(url: string | URL | Request, options?: RequestInit) {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}

export const link = new RPCLink({
  fetch: fetchWithCredentials,
  url: `${env.VITE_SERVER_URL}/rpc`,
});

export const client: AppRouterClient = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
