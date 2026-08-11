import { db } from "@bmhk-2026/db";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { eq } from "drizzle-orm";

import type { TeamAccessContext } from "../../core/auth";
import { createRepositoryExecutor } from "../../core/repository";
import { createTeamAccessCondition } from "../teams/teams.repository";
import { teamRegistrationReviewRepositoryError } from "./team-registration-reviews.errors";
import type {
  SaveTeamRegistrationReviewData,
  TeamRegistrationReview,
} from "./team-registration-reviews.schema";

export type SaveTeamRegistrationReviewRecordData = SaveTeamRegistrationReviewData & {
  reviewedAt: Date;
  reviewedByUserId: string;
};

export interface TeamRegistrationReviewLookup {
  review: TeamRegistrationReview | null;
  teamId: string;
}

export interface TeamRegistrationReviewSaveResult {
  previous: TeamRegistrationReview | null;
  review: TeamRegistrationReview;
}

export interface TeamRegistrationReviewRepository {
  findByTeamId: (
    access: TeamAccessContext,
    teamId: string,
  ) => Promise<TeamRegistrationReviewLookup | null>;
  save: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewRecordData,
  ) => Promise<TeamRegistrationReviewSaveResult | null>;
}

type Database = typeof db;

export function createTeamRegistrationReviewRepository(
  database: Database = db,
): TeamRegistrationReviewRepository {
  const execute = createRepositoryExecutor(teamRegistrationReviewRepositoryError);

  return {
    findByTeamId: async (access, teamId) =>
      await execute(async () => {
        const [result] = await database
          .select({ review: teamRegistrationReviews, teamId: teams.id })
          .from(teams)
          .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
          .where(createTeamAccessCondition(access, teamId))
          .limit(1);

        return result ?? null;
      }),
    save: async (access, teamId, data) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [team] = await transaction
              .select({ id: teams.id })
              .from(teams)
              .where(createTeamAccessCondition(access, teamId))
              .for("update")
              .limit(1);

            if (!team) {
              return null;
            }

            const [previous] = await transaction
              .select()
              .from(teamRegistrationReviews)
              .where(eq(teamRegistrationReviews.teamId, teamId))
              .limit(1);

            const [review] = await transaction
              .insert(teamRegistrationReviews)
              .values({ ...data, teamId, updatedAt: data.reviewedAt })
              .onConflictDoUpdate({
                set: { ...data, updatedAt: data.reviewedAt },
                target: teamRegistrationReviews.teamId,
              })
              .returning();

            if (!review) {
              throw new Error("Team registration review save returned no row");
            }

            return { previous: previous ?? null, review };
          }),
      ),
  };
}
