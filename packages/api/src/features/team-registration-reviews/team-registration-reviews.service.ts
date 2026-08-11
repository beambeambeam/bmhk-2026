import type { TeamAccessContext } from "../../core/auth";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamRegistrationReviewRepository } from "./team-registration-reviews.repository";
import type {
  SaveTeamRegistrationReviewData,
  TeamRegistrationReview,
  TeamRegistrationReviewFeedback,
  TeamRegistrationReviewStatus,
} from "./team-registration-reviews.schema";

export interface TeamRegistrationReviewSaveResult {
  previous: TeamRegistrationReview | null;
  review: TeamRegistrationReview;
}

export interface TeamRegistrationReviewService {
  get: (access: TeamAccessContext, teamId: string) => Promise<TeamRegistrationReview | null>;
  getFeedback: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamRegistrationReviewFeedback>;
  save: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewData,
  ) => Promise<TeamRegistrationReviewSaveResult>;
}

const APPROVED: TeamRegistrationReviewStatus = "APPROVED";
const CHANGES_REQUESTED: TeamRegistrationReviewStatus = "CHANGES_REQUESTED";
const PENDING_REVIEW: TeamRegistrationReviewStatus = "PENDING_REVIEW";

function subjectFeedbackStatus(
  reviewStatus: TeamRegistrationReviewStatus,
  issueCodes: readonly string[],
): TeamRegistrationReviewStatus {
  if (reviewStatus !== CHANGES_REQUESTED) {
    return reviewStatus;
  }

  return issueCodes.length > 0 ? CHANGES_REQUESTED : APPROVED;
}

function toReviewFeedback(review: TeamRegistrationReview | null): TeamRegistrationReviewFeedback {
  if (!review) {
    return {
      advisor: PENDING_REVIEW,
      participant1: PENDING_REVIEW,
      participant2: PENDING_REVIEW,
      participant3: PENDING_REVIEW,
      status: PENDING_REVIEW,
      statusUpdatedAt: null,
    };
  }

  return {
    advisor: subjectFeedbackStatus(review.status, review.advisorIssueCodes),
    participant1: subjectFeedbackStatus(review.status, review.participant1IssueCodes),
    participant2: subjectFeedbackStatus(review.status, review.participant2IssueCodes),
    participant3: subjectFeedbackStatus(review.status, review.participant3IssueCodes),
    status: review.status,
    statusUpdatedAt: review.reviewedAt,
  };
}

export function createTeamRegistrationReviewService(
  repository: TeamRegistrationReviewRepository,
): TeamRegistrationReviewService {
  return {
    get: async (access, teamId) => {
      const result = await repository.findByTeamId(access, teamId);
      if (!result) {
        throw createTeamNotFoundError();
      }

      return result.review;
    },
    getFeedback: async (access, teamId) => {
      const result = await repository.findByTeamId(access, teamId);
      if (!result) {
        throw createTeamNotFoundError();
      }

      return toReviewFeedback(result.review);
    },
    save: async (access, teamId, data) => {
      const result = await repository.save(access, teamId, {
        ...data,
        reviewedAt: new Date(),
        reviewedByUserId: access.actorId,
      });
      if (!result) {
        throw createTeamNotFoundError();
      }

      return result;
    },
  };
}
