import { db } from "@bmhk-2026/db";
import { participantCheckIns } from "@bmhk-2026/db/schema/participant-check-ins";
import { teamRegistrationReviews } from "@bmhk-2026/db/schema/team-registration-reviews";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teamCheckIns } from "@bmhk-2026/db/schema/team-check-ins";
import { teamRound2 } from "@bmhk-2026/db/schema/team-round2";
import { teams } from "@bmhk-2026/db/schema/teams";
import { isPostgresUniqueViolation } from "@bmhk-2026/db/errors";
import { files } from "@bmhk-2026/db/schema/files";
import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { TeamAccessContext } from "../../core/auth";
import { hasErrorCode } from "../../core/errors";

import { escapeLikePattern } from "../../core/query-builder";
import { createRepositoryExecutor, rethrowRepositoryError } from "../../core/repository";
import {
  createTeamAlreadyExistsError,
  createTeamRepositoryError,
  createTeamRosterLockedError,
  TEAM_ROSTER_LOCKED_ERROR_CODE,
  teamRepositoryError,
} from "./teams.errors";
import type {
  CreateTeamData,
  Team,
  TeamAward,
  TeamListInput,
  TeamListRow,
  UpdateTeamData,
} from "./teams.schema";
import { toStoredFileOfKind } from "../files/files.schema";
import type { CreateStoredFileData, StoredFile } from "../files/files.schema";

export interface TeamRepository {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (access: TeamAccessContext, id: string) => Promise<boolean>;
  findById: (access: TeamAccessContext, id: string) => Promise<TeamWithStoredImage | null>;
  findByUserId: (userId: string) => Promise<Team | null>;
  list: (
    access: TeamAccessContext,
    input: TeamListInput,
  ) => Promise<{ data: TeamListRow[]; total: number }>;
  update: (
    access: TeamAccessContext,
    id: string,
    data: UpdateTeamData | { award: TeamAward },
  ) => Promise<Team | null>;
  replaceImage: (
    access: TeamAccessContext,
    id: string,
    file: CreateStoredFileData,
  ) => Promise<{ previous: StoredFile | null; team: Team } | null>;
  setAward: (
    access: TeamAccessContext,
    id: string,
    award: TeamAward,
  ) => Promise<TeamAwardChange | null>;
}

export interface TeamAwardChange {
  previous: Team;
  roundOneCheckInsReset?: number;
  team: Team;
}

type Database = typeof db;

export type TeamWithStoredImage = Omit<Team, "image"> & {
  image: StoredFile | null;
};

export function createTeamAccessCondition(access: TeamAccessContext, teamId: string) {
  const targetTeam = eq(teams.id, teamId);
  return access.scope === "ALL_TEAMS"
    ? targetTeam
    : and(targetTeam, eq(teams.userId, access.actorId));
}

// registrationStatus lives on the joined review row; every other column is on teams.
const teamListSortColumns = {
  award: teams.award,
  memberCount: teams.memberCount,
  name: teams.name,
  registrationStatus: teamRegistrationReviews.status,
  school: teams.school,
} as const;

function createTeamListCondition(
  access: TeamAccessContext,
  search: string,
  award: TeamListInput["award"],
): SQL | undefined {
  const scope = access.scope === "ALL_TEAMS" ? undefined : eq(teams.userId, access.actorId);
  const pattern = `%${escapeLikePattern(search)}%`;
  const searchCondition =
    search.length > 0 ? or(ilike(teams.name, pattern), ilike(teams.school, pattern)) : undefined;
  const awardCondition = award === "ALL" ? undefined : eq(teams.award, award);

  return and(scope, searchCondition, awardCondition);
}

export function createTeamRepository(database: Database = db): TeamRepository {
  const execute = createRepositoryExecutor(teamRepositoryError);

  return {
    create: async (userId, data) => {
      try {
        const [team] = await database
          .insert(teams)
          .values({ ...data, userId })
          .returning();

        if (!team) {
          throw createTeamRepositoryError(new Error("Team insert returned no row"));
        }

        return team;
      } catch (error) {
        if (isPostgresUniqueViolation(error, "teams_user_id_unique")) {
          throw createTeamAlreadyExistsError();
        }

        return rethrowRepositoryError(error, teamRepositoryError);
      }
    },
    delete: async (access, id) => {
      try {
        return await database.transaction(async (transaction) => {
          const [team] = await transaction
            .select({ id: teams.id })
            .from(teams)
            .where(createTeamAccessCondition(access, id))
            .for("update")
            .limit(1);

          if (!team) {
            return false;
          }

          const [round2] = await transaction
            .select({ confirmedAt: teamRound2.confirmedAt })
            .from(teamRound2)
            .where(eq(teamRound2.teamId, team.id))
            .limit(1);

          if (round2 && round2.confirmedAt !== null) {
            throw createTeamRosterLockedError();
          }

          const [deletedTeam] = await transaction
            .delete(teams)
            .where(eq(teams.id, team.id))
            .returning({ id: teams.id });

          return deletedTeam !== undefined;
        });
      } catch (error) {
        if (hasErrorCode(error, TEAM_ROSTER_LOCKED_ERROR_CODE)) {
          throw error;
        }

        return rethrowRepositoryError(error, teamRepositoryError);
      }
    },
    findById: async (access, id) =>
      await execute(async () => {
        const [result] = await database
          .select({ image: files, team: teams })
          .from(teams)
          .leftJoin(files, eq(files.id, teams.image))
          .where(createTeamAccessCondition(access, id))
          .limit(1);

        if (!result) {
          return null;
        }

        return {
          ...result.team,
          image: result.image ? toStoredFileOfKind(result.image, "image") : null,
        };
      }),
    findByUserId: async (userId) =>
      await execute(async () => {
        const [team] = await database.select().from(teams).where(eq(teams.userId, userId)).limit(1);

        return team ?? null;
      }),
    list: async (access, { award, limit, offset, search, sortBy, sortDesc }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const condition = createTeamListCondition(access, search, award);
              const sortColumn = teamListSortColumns[sortBy];
              const [totalResult] = await transaction
                .select({ value: count() })
                .from(teams)
                .where(condition);
              const records = await transaction
                .select({
                  ...getTableColumns(teams),
                  registrationStatus: teamRegistrationReviews.status,
                })
                .from(teams)
                .leftJoin(teamRegistrationReviews, eq(teamRegistrationReviews.teamId, teams.id))
                .where(condition)
                // teams.index breaks ties so paging stays deterministic on repeated values.
                .orderBy(sortDesc ? desc(sortColumn) : asc(sortColumn), asc(teams.index))
                .limit(limit)
                .offset(offset);

              return {
                // A team with no review row yet has not been looked at, which is the same
                // state a freshly created review carries.
                data: records.map(({ registrationStatus, ...team }) => ({
                  ...team,
                  registrationStatus: registrationStatus ?? "PENDING_REVIEW",
                })),
                total: totalResult?.value ?? 0,
              };
            },
            {
              accessMode: "read only",
              isolationLevel: "repeatable read",
            },
          ),
      ),
    replaceImage: async (access, id, file) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [current] = await transaction
              .select()
              .from(teams)
              .where(createTeamAccessCondition(access, id))
              .for("update")
              .limit(1);
            if (!current) {
              return null;
            }
            let previous: StoredFile | null = null;
            if (current.image !== null) {
              const [oldFile] = await transaction
                .select()
                .from(files)
                .where(eq(files.id, current.image))
                .limit(1);
              previous = oldFile ? toStoredFileOfKind(oldFile, "image") : null;
            }
            await transaction.insert(files).values(file);
            const [team] = await transaction
              .update(teams)
              .set({ image: file.id })
              .where(createTeamAccessCondition(access, id))
              .returning();
            if (!team) {
              throw createTeamRepositoryError(new Error("Team image update returned no row"));
            }
            return { previous, team };
          }),
      ),
    setAward: async (access, id, award) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [previous] = await transaction
              .select()
              .from(teams)
              .where(createTeamAccessCondition(access, id))
              .for("update")
              .limit(1);
            if (!previous) {
              return null;
            }

            let roundOneCheckInsReset = 0;
            if (previous.award === "ROUND_1_PARTICIPATED" && award === "REGISTRATION_COMPLETE") {
              await transaction
                .delete(teamCheckIns)
                .where(
                  and(eq(teamCheckIns.teamId, previous.id), eq(teamCheckIns.round, "ROUND_1")),
                );
              const cancelledCheckIns = await transaction
                .delete(participantCheckIns)
                .where(
                  and(
                    eq(participantCheckIns.round, "ROUND_1"),
                    inArray(
                      participantCheckIns.participantId,
                      transaction
                        .select({ participantId: teamParticipants.id })
                        .from(teamParticipants)
                        .where(eq(teamParticipants.teamId, previous.id)),
                    ),
                  ),
                )
                .returning({ participantId: participantCheckIns.participantId });
              roundOneCheckInsReset = cancelledCheckIns.length;
            }

            const [team] = await transaction
              .update(teams)
              .set({ award })
              .where(eq(teams.id, previous.id))
              .returning();
            if (!team) {
              throw createTeamRepositoryError(new Error("Team award update returned no row"));
            }

            return { previous, roundOneCheckInsReset, team };
          }),
      ),
    update: async (access, id, data) => {
      try {
        return await database.transaction(async (transaction) => {
          const [previous] = await transaction
            .select({ id: teams.id, memberCount: teams.memberCount })
            .from(teams)
            .where(createTeamAccessCondition(access, id))
            .for("update")
            .limit(1);

          if (!previous) {
            return null;
          }

          const requestedMemberCount = "memberCount" in data ? data.memberCount : undefined;
          const changesMemberCount =
            requestedMemberCount !== undefined && requestedMemberCount !== previous.memberCount;
          if (changesMemberCount) {
            const [round2] = await transaction
              .select({ confirmedAt: teamRound2.confirmedAt })
              .from(teamRound2)
              .where(eq(teamRound2.teamId, previous.id))
              .limit(1);

            if (round2 && round2.confirmedAt !== null) {
              throw createTeamRosterLockedError();
            }
          }

          const [team] = await transaction
            .update(teams)
            .set(data)
            .where(eq(teams.id, id))
            .returning();

          return team ?? null;
        });
      } catch (error) {
        if (hasErrorCode(error, TEAM_ROSTER_LOCKED_ERROR_CODE)) {
          throw error;
        }

        return rethrowRepositoryError(error, teamRepositoryError);
      }
    },
  };
}
