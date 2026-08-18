import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { teamAdvisors } from "@bmhk-2026/db/schema/team-advisors";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, desc, eq, exists, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { TeamAccessContext } from "../../core/auth";
import { createRepositoryExecutor } from "../../core/repository";
import { escapeLikePattern } from "../../core/query-builder";
import { createTeamAccessCondition } from "../teams/teams.repository";
import { teamRegistrationReviewRepositoryError } from "./team-registration-reviews.errors";
import type {
  SaveTeamRegistrationReviewData,
  SaveTeamRegistrationReviewSubjectData,
  TeamRegistrationReview,
  TeamRegistrationReviewListFilter,
  TeamRegistrationReviewListSort,
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
  list: (input: {
    limit: number;
    offset: number;
    reviewStatus: TeamRegistrationReviewListFilter;
    search: string;
    sortBy: TeamRegistrationReviewListSort;
    sortDesc: boolean;
  }) => Promise<{ offset: number; records: TeamRegistrationReviewListRecord[]; total: number }>;
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
  readonly reviewedByName: string | null;
  readonly team: typeof teams.$inferSelect;
}

type Database = typeof db;
const normalizedUserRole = sql<string>`coalesce(${user.role}, 'user')`;

function reviewListCondition(reviewStatus: TeamRegistrationReviewListFilter) {
  if (reviewStatus === "ALL") {
    return sql`true`;
  }

  if (reviewStatus === "PENDING_REVIEW") {
    return or(
      isNull(teamRegistrationReviews.status),
      eq(teamRegistrationReviews.status, "PENDING_REVIEW"),
    );
  }

  return eq(teamRegistrationReviews.status, reviewStatus);
}

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
    list: async ({ limit, offset, reviewStatus, search, sortBy, sortDesc }) =>
      await execute(async () => {
        const reviewer = alias(user, "team_registration_reviewer");
        const sortColumns = {
          lastUpdatedAt: teamRegistrationReviews.updatedAt,
          memberCount: teams.memberCount,
          name: teams.name,
          registrationSubmittedAt: teams.registrationSubmittedAt,
          reviewStatus: teamRegistrationReviews.status,
          reviewedByName: reviewer.name,
          school: teams.school,
        } as const;
        const orderBy = sortDesc ? desc(sortColumns[sortBy]) : asc(sortColumns[sortBy]);
        const escapedSearch = escapeLikePattern(search);
        const searchPattern = `%${escapedSearch}%`;
        const searchCondition =
          search.length === 0
            ? and(eq(normalizedUserRole, "user"), isNotNull(teams.registrationSubmittedAt))
            : and(
                eq(normalizedUserRole, "user"),
                isNotNull(teams.registrationSubmittedAt),
                or(
                  ilike(teams.name, searchPattern),
                  ilike(teams.school, searchPattern),
                  exists(
                    database
                      .select({ id: teamParticipants.id })
                      .from(teamParticipants)
                      .where(
                        and(
                          eq(teamParticipants.teamId, teams.id),
                          or(
                            ilike(teamParticipants.firstNameEn, searchPattern),
                            ilike(teamParticipants.firstNameTh, searchPattern),
                            ilike(teamParticipants.lastNameEn, searchPattern),
                            ilike(teamParticipants.lastNameTh, searchPattern),
                            ilike(teamParticipants.nicknameEn, searchPattern),
                            ilike(teamParticipants.nicknameTh, searchPattern),
                            ilike(
                              sql<string>`concat_ws(' ', ${teamParticipants.firstNameEn}, ${teamParticipants.middleNameEn}, ${teamParticipants.lastNameEn})`,
                              searchPattern,
                            ),
                            ilike(
                              sql<string>`concat_ws(' ', ${teamParticipants.firstNameTh}, ${teamParticipants.middleNameTh}, ${teamParticipants.lastNameTh})`,
                              searchPattern,
                            ),
                          ),
                        ),
                      ),
                  ),
                  exists(
                    database
                      .select({ id: teamAdvisors.id })
                      .from(teamAdvisors)
                      .where(
                        and(
                          eq(teamAdvisors.teamId, teams.id),
                          or(
                            ilike(teamAdvisors.firstNameEn, searchPattern),
                            ilike(teamAdvisors.firstNameTh, searchPattern),
                            ilike(teamAdvisors.lastNameEn, searchPattern),
                            ilike(teamAdvisors.lastNameTh, searchPattern),
                            ilike(
                              sql<string>`concat_ws(' ', ${teamAdvisors.firstNameEn}, ${teamAdvisors.middleNameEn}, ${teamAdvisors.lastNameEn})`,
                              searchPattern,
                            ),
                            ilike(
                              sql<string>`concat_ws(' ', ${teamAdvisors.firstNameTh}, ${teamAdvisors.middleNameTh}, ${teamAdvisors.lastNameTh})`,
                              searchPattern,
                            ),
                          ),
                        ),
                      ),
                  ),
                ),
              );
        const reviewCondition = reviewListCondition(reviewStatus);
        const condition = and(searchCondition, reviewCondition);

        return await database.transaction(
          async (transaction) => {
            const [totalResult] = await transaction
              .select({ value: count() })
              .from(teams)
              .innerJoin(user, eq(user.id, teams.userId))
              .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
              .where(condition);
            const total = totalResult?.value ?? 0;
            const lastPageOffset = Math.max(0, Math.ceil(total / limit) - 1) * limit;
            const pageOffset = Math.min(offset, lastPageOffset);
            const records = await transaction
              .select({
                review: teamRegistrationReviews,
                reviewedByName: reviewer.name,
                team: teams,
              })
              .from(teams)
              .innerJoin(user, eq(user.id, teams.userId))
              .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
              .leftJoin(reviewer, eq(reviewer.id, teamRegistrationReviews.reviewedByUserId))
              .where(condition)
              .orderBy(orderBy, asc(teams.index))
              .limit(limit)
              .offset(pageOffset);

            return { offset: pageOffset, records, total };
          },
          { accessMode: "read only", isolationLevel: "repeatable read" },
        );
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
