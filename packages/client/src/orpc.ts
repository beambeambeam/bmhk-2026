import type { AppRouterClient } from "@bmhk-2026/api";
import { env } from "@bmhk-2026/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient();
}

export const queryClient = createQueryClient();

async function fetchWithCredentials(url: string | URL | Request, options?: RequestInit) {
  return await fetch(url, {
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
