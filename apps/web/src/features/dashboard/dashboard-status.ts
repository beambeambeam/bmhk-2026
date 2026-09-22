import type { TeamStatus } from "./team-data";

const SEMIFINAL_AWARDS = new Set([
  "ROUND_2_COMPLETED",
  "HONORABLE_MENTION",
  "THIRD_PLACE",
  "SECOND_PLACE",
  "FIRST_PLACE",
]);

function isSemifinalAward(award: string | null | undefined): boolean {
  return typeof award === "string" && SEMIFINAL_AWARDS.has(award);
}

export interface FeatureFlagsInput {
  eligibleTeamsAnnouncement?: boolean;
  finalRound?: boolean;
  qualifyingResultsAnnouncement?: boolean;
  qualifyingRound?: boolean;
  registration?: boolean;
}

function getApprovedStatus(
  award: string | null | undefined,
  featureFlags?: FeatureFlagsInput | null,
): TeamStatus {
  const isEligibleTeamsAnnounced = featureFlags?.eligibleTeamsAnnouncement === true;
  const isQualifyingRoundStarted = featureFlags?.qualifyingRound === true;
  const isQualifyingResultsAnnounced = featureFlags?.qualifyingResultsAnnouncement === true;

  if (!isEligibleTeamsAnnounced) {
    return "selection-pending";
  }

  if (isQualifyingResultsAnnounced) {
    if (isSemifinalAward(award)) {
      return "semifinal-qualified";
    }
    if (award === "ROUND_1_COMPLETED") {
      return "semifinal-failed";
    }
  }

  if (isQualifyingRoundStarted && (award === "ROUND_1_COMPLETED" || isSemifinalAward(award))) {
    return "semifinal-pending";
  }

  if (
    award === "REGISTRATION_COMPLETED" ||
    award === "ROUND_1_COMPLETED" ||
    isSemifinalAward(award)
  ) {
    return "qualified";
  }

  if (award === "NOT_QUALIFIED" || award === "NO_ACHIEVEMENT") {
    return "selection-failed";
  }

  return "selection-pending";
}

export function getDashboardStatus(
  reviewFeedback: { status: string } | null | undefined,
  team: { award?: string | null } | null | undefined,
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
