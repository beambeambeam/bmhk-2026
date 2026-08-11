import type { FeatureFlags } from "@bmhk-2026/api";
import type { FeatureFlagKey } from "@bmhk-2026/feature-flags";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "./orpc";

const unavailableFeatureFlags: FeatureFlags = {
  eligibleTeamsAnnouncement: false,
  finalRound: false,
  qualifyingResultsAnnouncement: false,
  qualifyingRound: false,
  registration: false,
};

export function useFeatureFlags(): FeatureFlags {
  const query = useQuery(
    orpc.featureFlags.getAll.queryOptions({
      gcTime: Number.POSITIVE_INFINITY,
      refetchInterval: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  );

  return query.data ?? unavailableFeatureFlags;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useFeatureFlags()[key];
}
