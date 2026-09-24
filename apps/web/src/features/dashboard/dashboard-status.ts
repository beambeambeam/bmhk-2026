import type { TeamStatus } from "./team-data";

const SEMIFINAL_AWARDS = new Set([
  "ADVANCED_TO_ROUND_3",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
]);

export interface FeatureFlagsInput {
  eligibleTeamsAnnouncement?: boolean;
  finalRound?: boolean;
  qualifyingResultsAnnouncement?: boolean;
  qualifyingRound?: boolean;
  registration?: boolean;
}

function getCompetitionStatus(
  award: string | undefined,
  featureFlags?: FeatureFlagsInput | null,
): TeamStatus | null {
  const isOnlineRoundStarted = featureFlags?.qualifyingRound === true;
  const isOnlineResultsAnnounced = featureFlags?.qualifyingResultsAnnouncement === true;

  if (award === "ROUND_1_PARTICIPATED") {
    if (isOnlineResultsAnnounced) {
      return "round1-failed";
    }
    if (isOnlineRoundStarted) {
      return "round1-pending";
    }
  }

  if (award === "ADVANCED_TO_ROUND_2" && isOnlineResultsAnnounced) {
    return "semifinal-pending";
  }

  if (award === "ROUND_2_PARTICIPATED") {
    return "semifinal-failed";
  }

  if (award !== undefined && SEMIFINAL_AWARDS.has(award)) {
    return "semifinal-qualified";
  }

  return null;
}

function getApprovedStatus(
  award: string | undefined,
  featureFlags?: FeatureFlagsInput | null,
): TeamStatus {
  if (featureFlags?.eligibleTeamsAnnouncement !== true) {
    return "selection-pending";
  }

  const competitionStatus = getCompetitionStatus(award, featureFlags);
  if (competitionStatus !== null) {
    return competitionStatus;
  }

  if (
    award === "REGISTRATION_COMPLETE" ||
    award === "ADVANCED_TO_ROUND_2" ||
    award === "ROUND_2_PARTICIPATED" ||
    (award !== undefined && SEMIFINAL_AWARDS.has(award))
  ) {
    return "qualified";
  }

  if (award === "REGISTRATION_FAILED" || award === "NO_ACHIEVEMENT") {
    return "selection-failed";
  }

  return "selection-pending";
}

export function getDashboardStatus(
  reviewFeedback: { status: string } | null | undefined,
  team: { award?: string } | null | undefined,
  featureFlags?: FeatureFlagsInput | null,
): TeamStatus {
  const feedbackStatus = reviewFeedback?.status;

  if (feedbackStatus === "APPROVED") {
    return getApprovedStatus(team?.award, featureFlags);
  }

  if (featureFlags?.eligibleTeamsAnnouncement === true) {
    return "selection-failed";
  }

  if (feedbackStatus === "REJECTED" || feedbackStatus === "FAILED") {
    return "rejected";
  }

  if (feedbackStatus === "CHANGES_REQUESTED") {
    return "issue";
  }

  return "reviewing";
}

export function getAutoOpenedModal(
  status: TeamStatus,
  featureFlags?: FeatureFlagsInput | null,
): string | null {
  const isAnnouncementWindow =
    featureFlags?.eligibleTeamsAnnouncement === true &&
    featureFlags?.qualifyingRound !== true &&
    featureFlags?.qualifyingResultsAnnouncement !== true &&
    featureFlags?.finalRound !== true;

  if (isAnnouncementWindow) {
    if (
      status === "qualified" ||
      status === "semifinal-qualified" ||
      status === "semifinal-pending"
    ) {
      return "qualified";
    }
    if (status === "selection-failed" || status === "rejected") {
      return status;
    }
  }

  return null;
}
