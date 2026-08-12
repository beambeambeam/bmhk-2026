import { orpc } from "./orpc";

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const HEALTH_CHECK_STALE_TIME_MS = 10_000;

export function getHealthCheckQueryOptions() {
  return orpc.health.check.queryOptions({
    refetchInterval: HEALTH_CHECK_INTERVAL_MS,
    staleTime: HEALTH_CHECK_STALE_TIME_MS,
  });
}

export function getPrivateDataQueryOptions(userId: string | undefined, enabled = true) {
  return orpc.privateData.get.queryOptions({
    enabled: enabled && userId !== undefined,
    queryKey: [...orpc.privateData.get.queryKey(), { userId }],
  });
}
