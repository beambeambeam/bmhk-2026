import { ORPCError } from "@orpc/client";
import { StandardRPCJsonSerializer, StandardRPCSerializer } from "@orpc/client/standard";
import { environmentManager, QueryClient } from "@tanstack/react-query";

const DEFAULT_STALE_TIME_MS = 60_000;
const MAX_QUERY_RETRIES = 2;
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer());

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (environmentManager.isServer() || failureCount >= MAX_QUERY_RETRIES) {
    return false;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return false;
  }

  if (error instanceof ORPCError) {
    return TRANSIENT_HTTP_STATUSES.has(error.status);
  }

  return true;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      dehydrate: {
        serializeData: (data) => serializer.serialize(data),
      },
      hydrate: {
        deserializeData: (data) => serializer.deserialize(data),
      },
      mutations: {
        retry: false,
      },
      queries: {
        queryKeyHashFn: (queryKey) => JSON.stringify(serializer.serialize(queryKey)),
        retry: shouldRetryQuery,
        staleTime: DEFAULT_STALE_TIME_MS,
      },
    },
  });
}
