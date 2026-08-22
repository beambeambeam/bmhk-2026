import type { FeatureFlags } from "@bmhk-2026/api";
import { featureFlags } from "@bmhk-2026/feature-flags";
import type { FeatureFlagKey } from "@bmhk-2026/feature-flags";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "./orpc";

const unavailableFeatureFlags: FeatureFlags = {
  eligibleTeamsAnnouncement: false,
  finalRound: false,
  qualifyingResultsAnnouncement: false,
  qualifyingRound: false,
  qualifyingRoundIdentityConfirmation: false,
  registration: false,
};

const CLOCK_SKEW_BUFFER_MS = 1000;
const ERROR_RECOVERY_INTERVAL_MS = 60_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;
// Well under the 32-bit setTimeout limit on purpose. React Query schedules the stale
// timer as `timeUntilStale + 1`, and a clock that moves backwards (fake timers, NTP
// correction) can push that further still; crossing the limit silently degrades the
// timer to 1ms, which would mark the query stale right after every fetch. A boundary
// further out than this simply gets re-checked once a fortnight instead of held for
// the whole span, which is indistinguishable in practice.
const MAX_STALE_TIME_MS = 14 * 24 * 60 * 60 * 1000;
const featureFlagTransitions = Object.values(featureFlags)
  .flatMap((featureFlag) => [
    Date.parse(featureFlag.startsAt),
    ...("endsAt" in featureFlag ? [Date.parse(featureFlag.endsAt)] : []),
  ])
  .toSorted((first, second) => first - second);

function getNextTransition(after: number): number | undefined {
  return featureFlagTransitions.find((transition) => transition > after);
}

function getFeatureFlagsStaleTime(dataUpdatedAt: number): number {
  const freshnessStartedAt = dataUpdatedAt || Date.now();
  const nextTransition = getNextTransition(freshnessStartedAt);

  // Clamped like getFeatureFlagsRefetchInterval below: an unclamped value beyond the
  // 32-bit setTimeout limit silently becomes a 1ms timeout, marking the query stale
  // immediately after every fetch instead of holding until the next boundary.
  return nextTransition === undefined
    ? Number.POSITIVE_INFINITY
    : Math.min(nextTransition - freshnessStartedAt, MAX_STALE_TIME_MS);
}

function getFeatureFlagsRefetchInterval(hasError: boolean): number | false {
  if (hasError) {
    return ERROR_RECOVERY_INTERVAL_MS;
  }

  const nextTransition = getNextTransition(Date.now());
  if (nextTransition === undefined) {
    return false;
  }

  return Math.min(nextTransition - Date.now() + CLOCK_SKEW_BUFFER_MS, MAX_TIMER_DELAY_MS);
}

export function useFeatureFlags(): FeatureFlags {
  const query = useQuery(
    orpc.featureFlags.getAll.queryOptions({
      refetchInterval: (featureFlagsQuery) =>
        getFeatureFlagsRefetchInterval(featureFlagsQuery.state.status === "error"),
      retry: false,
      staleTime: (featureFlagsQuery) =>
        getFeatureFlagsStaleTime(featureFlagsQuery.state.dataUpdatedAt),
    }),
  );

  return query.data ?? unavailableFeatureFlags;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useFeatureFlags()[key];
}
