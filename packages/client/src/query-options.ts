import type { AdminUserListQuery } from "@bmhk-2026/api";

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

export function getAdminUserFilterQueryOptions(userId?: string) {
  return orpc.adminUsers.filter.queryOptions({
    enabled: userId !== undefined,
    queryKey: [...orpc.adminUsers.filter.queryKey(), { userId }],
  });
}

export function getAdminUserListQueryOptions(
  userId: string | undefined,
  input: AdminUserListQuery,
) {
  return orpc.adminUsers.list.queryOptions({
    enabled: userId !== undefined,
    input,
    queryKey: [...orpc.adminUsers.list.queryKey({ input }), { userId }],
  });
}

export function getStaffRegistrationListQueryOptions() {
  return orpc.staffRegistrations.list.queryOptions({});
}

export function getStaffRegistrationQueryOptions(id: string) {
  return orpc.staffRegistrations.get.queryOptions({ input: { id } });
}

export function getParticipationListQueryOptions() {
  return orpc.teams.list.queryOptions({ input: { limit: 100, offset: 0 } });
}

export function getParticipationQueryOptions(teamId: string) {
  return orpc.teams.get.queryOptions({ input: { id: teamId } });
}

export function getParticipationParticipantsQueryOptions(teamId: string) {
  return orpc.teamParticipants.list.queryOptions({ input: { teamId } });
}

export function getParticipationAdvisorQueryOptions(teamId: string) {
  return orpc.teamAdvisors.get.queryOptions({ input: { teamId } });
}

export function getParticipationConsentQueryOptions(teamId: string) {
  return orpc.teamConsents.get.queryOptions({ input: { teamId } });
}

export function getParticipationStatusQueryOptions(teamId: string) {
  return orpc.teamRegistrationStatus.getByTeamId.queryOptions({ input: { teamId } });
}

export function getParticipationReviewQueryOptions(teamId: string) {
  return orpc.teamRegistrationReviews.get.queryOptions({ input: { teamId } });
}
