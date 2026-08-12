import type { AppRouterClient } from "@bmhk-2026/api";
import { env } from "@bmhk-2026/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

async function fetchWithCredentials(url: string | URL | Request, options?: RequestInit) {
  return await fetch(url, {
    ...options,
    credentials: "include",
  });
}

export const link = createIsomorphicFn()
  .server(
    () =>
      new RPCLink({
        headers: () => getRequestHeaders(),
        url: `${env.VITE_SERVER_URL}/rpc`,
      }),
  )
  .client(
    () =>
      new RPCLink({
        fetch: fetchWithCredentials,
        url: `${env.VITE_SERVER_URL}/rpc`,
      }),
  )();

export const client: AppRouterClient = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
