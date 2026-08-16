import type { TeamAccessContext } from "../../core/auth";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamRegistrationReviewRepository } from "./team-registration-reviews.repository";
import type {
  SaveTeamRegistrationReviewData,
  SaveTeamRegistrationReviewSubjectData,
  TeamRegistrationReview,
  TeamRegistrationReviewFeedback,
  TeamRegistrationReviewListFilter,
  TeamRegistrationReviewListResult,
  TeamRegistrationReviewListSubjectStatus,
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
  saveSubject: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewSubjectData,
  ) => Promise<TeamRegistrationReviewSaveResult>;
  list: (input: {
    reviewStatus: TeamRegistrationReviewListFilter;
    search: string;
  }) => Promise<TeamRegistrationReviewListResult>;
}

const APPROVED: TeamRegistrationReviewStatus = "APPROVED";
const CHANGES_REQUESTED: TeamRegistrationReviewStatus = "CHANGES_REQUESTED";
const PENDING_REVIEW: TeamRegistrationReviewStatus = "PENDING_REVIEW";

function listSubjectStatus(
  review: TeamRegistrationReview | null,
  issueCodes: readonly string[],
): TeamRegistrationReviewListSubjectStatus {
  if (review === null) {
    return PENDING_REVIEW;
  }
  return subjectFeedbackStatus(review.status, issueCodes);
}

function matchesListFilter(
  row: TeamRegistrationReviewListResult["rows"][number],
  filter: TeamRegistrationReviewListFilter,
): boolean {
  return (
    filter === "ALL" ||
    [row.advisor, row.participant1, row.participant2, row.participant3].some(
      (status) => status === filter,
    )
  );
}

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
    list: async ({ reviewStatus, search }) => {
      const records = await repository.list(search);
      const rows = records.map(({ review, team }) => ({
        advisor: listSubjectStatus(review, review?.advisorIssueCodes ?? []),
        id: team.id,
        memberCount: team.memberCount,
        name: team.name,
        participant1: listSubjectStatus(review, review?.participant1IssueCodes ?? []),
        participant2: listSubjectStatus(review, review?.participant2IssueCodes ?? []),
        participant3:
          team.memberCount === 2
            ? "NOT_APPLICABLE"
            : listSubjectStatus(review, review?.participant3IssueCodes ?? []),
        registrationSubmittedAt: team.registrationSubmittedAt,
        school: team.school,
      }));
      return { rows: rows.filter((row) => matchesListFilter(row, reviewStatus)) };
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
    saveSubject: async (access, teamId, data) => {
      const result = await repository.saveSubject(access, teamId, {
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
