import type { TeamAccessContext } from "../../core/auth";
import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamRegistrationReviewRepository } from "./team-registration-reviews.repository";
import type {
  SaveTeamRegistrationReviewData,
  TeamRegistrationReview,
} from "./team-registration-reviews.schema";

export interface TeamRegistrationReviewSaveResult {
  previous: TeamRegistrationReview | null;
  review: TeamRegistrationReview;
}

export interface TeamRegistrationReviewService {
  get: (access: TeamAccessContext, teamId: string) => Promise<TeamRegistrationReview | null>;
  save: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewData,
  ) => Promise<TeamRegistrationReviewSaveResult>;
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
