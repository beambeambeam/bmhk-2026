import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";

import type { TeamAccessContext } from "../../core/auth";
import { createRepositoryExecutor } from "../../core/repository";
import { escapeLikePattern } from "../../core/query-builder";
import { createTeamAccessCondition } from "../teams/teams.repository";
import { teamRegistrationReviewRepositoryError } from "./team-registration-reviews.errors";
import type {
  SaveTeamRegistrationReviewData,
  SaveTeamRegistrationReviewSubjectData,
  TeamRegistrationReview,
  TeamRegistrationReviewSubject,
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
  list: (search: string) => Promise<TeamRegistrationReviewListRecord[]>;
  save: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewRecordData,
  ) => Promise<TeamRegistrationReviewSaveResult | null>;
  saveSubject: (
    access: TeamAccessContext,
    teamId: string,
    data: SaveTeamRegistrationReviewSubjectData & { reviewedAt: Date; reviewedByUserId: string },
  ) => Promise<TeamRegistrationReviewSaveResult | null>;
}

export interface TeamRegistrationReviewListRecord {
  readonly review: TeamRegistrationReview | null;
  readonly team: typeof teams.$inferSelect;
}

type Database = typeof db;
const normalizedUserRole = sql<string>`coalesce(${user.role}, 'user')`;

function issueCodesForSubject(
  review: TeamRegistrationReview | null,
  subject: TeamRegistrationReviewSubject,
): string[] {
  if (review === null) {
    return [];
  }
  return [...review[`${subject}IssueCodes`]];
}

function subjectReviewFields(
  review: TeamRegistrationReview | null,
  subject: TeamRegistrationReviewSubject,
): { note: string | null; reviewedAt: Date | null } {
  if (review === null) {
    return { note: null, reviewedAt: null };
  }

  switch (subject) {
    case "advisor": {
      return { note: review.advisorNotes, reviewedAt: review.advisorReviewedAt };
    }
    case "participant1": {
      return { note: review.participant1Notes, reviewedAt: review.participant1ReviewedAt };
    }
    case "participant2": {
      return { note: review.participant2Notes, reviewedAt: review.participant2ReviewedAt };
    }
    case "participant3": {
      return { note: review.participant3Notes, reviewedAt: review.participant3ReviewedAt };
    }
    default: {
      return { note: null, reviewedAt: null };
    }
  }
}

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
    list: async (search) =>
      await execute(async () => {
        const escapedSearch = escapeLikePattern(search);
        const condition =
          search.length === 0
            ? and(eq(normalizedUserRole, "user"), isNotNull(teams.registrationSubmittedAt))
            : and(
                eq(normalizedUserRole, "user"),
                isNotNull(teams.registrationSubmittedAt),
                or(
                  ilike(teams.name, `%${escapedSearch}%`),
                  ilike(teams.school, `%${escapedSearch}%`),
                ),
              );
        return await database
          .select({ review: teamRegistrationReviews, team: teams })
          .from(teams)
          .innerJoin(user, eq(user.id, teams.userId))
          .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
          .where(condition)
          .orderBy(asc(teams.index));
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
    saveSubject: async (access, teamId, data) =>
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
            const current = previous ?? null;
            const issueCodes = data.status === "CHANGES_REQUESTED" ? ["REVIEW_REQUIRED"] : [];
            const advisorReview =
              data.subject === "advisor"
                ? { note: data.note, reviewedAt: data.reviewedAt }
                : subjectReviewFields(current, "advisor");
            const participant1Review =
              data.subject === "participant1"
                ? { note: data.note, reviewedAt: data.reviewedAt }
                : subjectReviewFields(current, "participant1");
            const participant2Review =
              data.subject === "participant2"
                ? { note: data.note, reviewedAt: data.reviewedAt }
                : subjectReviewFields(current, "participant2");
            const participant3Review =
              data.subject === "participant3"
                ? { note: data.note, reviewedAt: data.reviewedAt }
                : subjectReviewFields(current, "participant3");
            const reviewData = {
              advisorIssueCodes:
                data.subject === "advisor" ? issueCodes : issueCodesForSubject(current, "advisor"),
              advisorNotes: advisorReview.note,
              advisorReviewedAt: advisorReview.reviewedAt,
              participant1IssueCodes:
                data.subject === "participant1"
                  ? issueCodes
                  : issueCodesForSubject(current, "participant1"),
              participant1Notes: participant1Review.note,
              participant1ReviewedAt: participant1Review.reviewedAt,
              participant2IssueCodes:
                data.subject === "participant2"
                  ? issueCodes
                  : issueCodesForSubject(current, "participant2"),
              participant2Notes: participant2Review.note,
              participant2ReviewedAt: participant2Review.reviewedAt,
              participant3IssueCodes:
                data.subject === "participant3"
                  ? issueCodes
                  : issueCodesForSubject(current, "participant3"),
              participant3Notes: participant3Review.note,
              participant3ReviewedAt: participant3Review.reviewedAt,
              reviewedAt: data.reviewedAt,
              reviewedByUserId: data.reviewedByUserId,
            };
            const hasIssues =
              reviewData.advisorIssueCodes.length > 0 ||
              reviewData.participant1IssueCodes.length > 0 ||
              reviewData.participant2IssueCodes.length > 0 ||
              reviewData.participant3IssueCodes.length > 0;
            const [review] = await transaction
              .insert(teamRegistrationReviews)
              .values({
                ...reviewData,
                status: hasIssues ? "CHANGES_REQUESTED" : "APPROVED",
                teamId,
                updatedAt: data.reviewedAt,
              })
              .onConflictDoUpdate({
                set: {
                  ...reviewData,
                  status: hasIssues ? "CHANGES_REQUESTED" : "APPROVED",
                  updatedAt: data.reviewedAt,
                },
                target: teamRegistrationReviews.teamId,
              })
              .returning();
            if (!review) {
              throw new Error("Team registration subject review save returned no row");
            }
            return { previous: current, review };
          }),
      ),
  };
}
