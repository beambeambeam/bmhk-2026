import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { participantCheckIns } from "@bmhk-2026/db/schema/participant-check-ins";
import { teamCheckIns } from "@bmhk-2026/db/schema/team-check-ins";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { roundTwoEligibleAwardValues, teams } from "@bmhk-2026/db/schema/teams";
import { and, countDistinct, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import { createTableOrderBy, createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { createRepositoryExecutor } from "../../core/repository";
import { getTableOffset } from "../../core/table-query";
import { participantCheckInRepositoryError } from "./participant-check-ins.errors";
import { teamCheckInAwards } from "./participant-check-ins.schema";
import type {
  CheckInRound,
  ParticipantCheckInColumnFilter,
  ParticipantCheckInFlag,
  ParticipantCheckInListQuery,
  ParticipantCheckInListResult,
  ParticipantCheckInSort,
} from "./participant-check-ins.schema";

export type ParticipantCheckInAttempt =
  | "ALREADY_CHECKED_IN"
  | "CREATED"
  | "NOT_ELIGIBLE"
  | "TARGET_NOT_FOUND";

export interface ParticipantCheckInRepository {
  cancel: (participantId: string, round: CheckInRound) => Promise<boolean>;
  checkIn: (
    participantId: string,
    checkedInByUserId: string,
    round: CheckInRound,
  ) => Promise<ParticipantCheckInAttempt>;
  registerTeam: (
    teamId: string,
    userId: string,
    round: CheckInRound,
  ) => Promise<"CREATED" | "ALREADY_CHECKED_IN" | "NOT_ELIGIBLE" | "TARGET_NOT_FOUND">;
  cancelTeam: (teamId: string, round: CheckInRound) => Promise<boolean>;
  list: (query: ParticipantCheckInListQuery) => Promise<ParticipantCheckInListResult>;
  updateFlag: (
    participantId: string,
    flag: ParticipantCheckInFlag | null,
    round: CheckInRound,
  ) => Promise<boolean>;
}

type Database = typeof db;
const teamCheckedInByUser = alias(user, "team_checked_in_by_user");
const checkedInByUser = alias(user, "participant_checked_in_by_user");
const participantCheckInSortColumns = {
  checkedInAt: participantCheckIns.checkedInAt,
  email: teamParticipants.email,
  flag: participantCheckIns.flag,
  name: teamParticipants.firstNameTh,
  teamCode: teams.index,
  teamName: teams.name,
} as const;
const teamSortColumns = {
  teamCode: teams.index,
  teamName: teams.name,
} as const;
const teamCodeSearchColumn = sql<string>`'BH' || lpad(
  ${teams.index}::text,
  greatest(3, length(${teams.index}::text)),
  '0'
) || '/26'`;
const defaultParticipantCheckInSorting = [
  { desc: false, id: "name" },
] as const satisfies readonly ParticipantCheckInSort[];
const defaultTeamSorting = [{ desc: false, id: "teamCode" }] as const;

interface ParticipantNameFields {
  readonly firstNameTh: string;
  readonly lastNameTh: string;
  readonly middleNameTh: string | null;
  readonly titleTh: string;
}

function participantName(participant: ParticipantNameFields): string {
  return [
    participant.titleTh,
    participant.firstNameTh,
    participant.middleNameTh,
    participant.lastNameTh,
  ]
    .filter(Boolean)
    .join(" ");
}

function isRoundTwoEligible(award: string): boolean {
  return (roundTwoEligibleAwardValues as readonly string[]).includes(award);
}

function createParticipantCheckInFilterCondition(
  filter: ParticipantCheckInColumnFilter,
): SQL | undefined {
  if (filter.id === "teamCheckIn") {
    return filter.value === "registered"
      ? isNotNull(teamCheckIns.teamId)
      : isNull(teamCheckIns.teamId);
  }
  if (filter.value.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(filter.value)}%`;
  return or(ilike(teams.name, pattern), ilike(teamCodeSearchColumn, pattern));
}

export function createParticipantCheckInRepository(
  database: Database = db,
): ParticipantCheckInRepository {
  const execute = createRepositoryExecutor(participantCheckInRepositoryError);
  return {
    cancel: async (participantId, round) =>
      await execute(async () => {
        const cancelled = await database
          .delete(participantCheckIns)
          .where(
            and(
              eq(participantCheckIns.participantId, participantId),
              eq(participantCheckIns.round, round),
            ),
          )
          .returning({ participantId: participantCheckIns.participantId });
        return cancelled.length > 0;
      }),
    cancelTeam: async (teamId, round) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [team] = await transaction
              .select({ award: teams.award })
              .from(teams)
              .where(eq(teams.id, teamId))
              .for("update")
              .limit(1);
            if (!team) {
              return false;
            }
            const deleted = await transaction
              .delete(teamCheckIns)
              .where(and(eq(teamCheckIns.teamId, teamId), eq(teamCheckIns.round, round)))
              .returning({ teamId: teamCheckIns.teamId });
            if (deleted.length === 0) {
              return false;
            }
            await transaction
              .delete(participantCheckIns)
              .where(
                and(
                  eq(participantCheckIns.round, round),
                  inArray(
                    participantCheckIns.participantId,
                    transaction
                      .select({ id: teamParticipants.id })
                      .from(teamParticipants)
                      .where(eq(teamParticipants.teamId, teamId)),
                  ),
                ),
              );
            if (team.award === teamCheckInAwards[round].participated) {
              await transaction
                .update(teams)
                .set({ award: teamCheckInAwards[round].eligible })
                .where(eq(teams.id, teamId));
            }
            return true;
          }),
      ),
    checkIn: async (participantId, checkedInByUserId, round) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [participant] = await transaction
              .select({ award: teams.award, id: teamParticipants.id, teamId: teams.id })
              .from(teamParticipants)
              .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
              .where(eq(teamParticipants.id, participantId))
              .for("update", { of: [teams, teamParticipants] })
              .limit(1);
            if (!participant) {
              return "TARGET_NOT_FOUND";
            }
            const [teamCheckIn] = await transaction
              .select({ teamId: teamCheckIns.teamId })
              .from(teamCheckIns)
              .where(
                and(eq(teamCheckIns.teamId, participant.teamId), eq(teamCheckIns.round, round)),
              )
              .limit(1);
            if (!teamCheckIn) {
              return "NOT_ELIGIBLE";
            }
            // Mirrors the round-2 gate in list(): the roster hides unqualified teams, so
            // writes must refuse them too rather than relying on the UI to filter.
            if (round === "ROUND_2" && !isRoundTwoEligible(participant.award)) {
              return "NOT_ELIGIBLE";
            }
            const created = await transaction
              .insert(participantCheckIns)
              .values({ checkedInByUserId, participantId, round })
              .onConflictDoNothing({
                target: [participantCheckIns.participantId, participantCheckIns.round],
              })
              .returning({ participantId: participantCheckIns.participantId });
            return created.length > 0 ? "CREATED" : "ALREADY_CHECKED_IN";
          }),
      ),
    list: async ({ columnFilters, pagination, round, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const columnFilterCondition = createTableWhere(
                columnFilters,
                createParticipantCheckInFilterCondition,
              );
              let roundGate: SQL | undefined;
              if (round === "ROUND_1") {
                roundGate = or(
                  eq(teams.award, "REGISTRATION_COMPLETE"),
                  isNotNull(teamCheckIns.teamId),
                );
              } else if (round === "ROUND_2") {
                roundGate = inArray(teams.award, roundTwoEligibleAwardValues);
              }
              const filters = and(columnFilterCondition, roundGate);
              const [totalResult] = await transaction
                .select({ value: countDistinct(teams.id) })
                .from(teamParticipants)
                .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
                .leftJoin(
                  teamCheckIns,
                  and(eq(teamCheckIns.teamId, teams.id), eq(teamCheckIns.round, round)),
                )
                .where(filters);
              const teamSorting: { desc: boolean; id: "teamCode" | "teamName" }[] = [];
              for (const sort of sorting) {
                if (sort.id === "teamCode") {
                  teamSorting.push({ desc: sort.desc, id: "teamCode" });
                } else if (sort.id === "teamName") {
                  teamSorting.push({ desc: sort.desc, id: "teamName" });
                }
              }
              const teamPage = await transaction
                .select({
                  award: teams.award,
                  id: teams.id,
                  index: teams.index,
                  name: teams.name,
                  teamCheckedInAt: teamCheckIns.checkedInAt,
                  teamCheckedInByName: teamCheckedInByUser.name,
                })
                .from(teams)
                .innerJoin(teamParticipants, eq(teamParticipants.teamId, teams.id))
                .leftJoin(
                  teamCheckIns,
                  and(eq(teamCheckIns.teamId, teams.id), eq(teamCheckIns.round, round)),
                )
                .leftJoin(
                  teamCheckedInByUser,
                  eq(teamCheckedInByUser.id, teamCheckIns.checkedInByUserId),
                )
                .where(filters)
                .groupBy(
                  teams.id,
                  teams.index,
                  teams.name,
                  teams.award,
                  teamCheckIns.checkedInAt,
                  teamCheckedInByUser.name,
                )
                .orderBy(
                  ...createTableOrderBy({
                    columns: teamSortColumns,
                    fallbackSorting: defaultTeamSorting,
                    sorting: teamSorting,
                    stableColumn: teams.id,
                  }),
                )
                .limit(pagination.pageSize)
                .offset(getTableOffset(pagination));
              const teamRows: ParticipantCheckInListResult["rows"] = teamPage.map(
                ({ teamCheckedInAt, teamCheckedInByName, ...team }) => ({
                  ...team,
                  members: [],
                  teamCheckIn:
                    teamCheckedInAt !== null && teamCheckedInByName !== null
                      ? { checkedInAt: teamCheckedInAt, checkedInByName: teamCheckedInByName }
                      : null,
                }),
              );
              if (teamRows.length === 0) {
                return { rowCount: totalResult?.value ?? 0, rows: teamRows };
              }
              const teamById = new Map(teamRows.map((team) => [team.id, team]));
              const records = await transaction
                .select({
                  checkedInAt: participantCheckIns.checkedInAt,
                  checkedInByName: checkedInByUser.name,
                  email: teamParticipants.email,
                  firstNameTh: teamParticipants.firstNameTh,
                  flag: participantCheckIns.flag,
                  id: teamParticipants.id,
                  lastNameTh: teamParticipants.lastNameTh,
                  middleNameTh: teamParticipants.middleNameTh,
                  teamId: teams.id,
                  titleTh: teamParticipants.titleTh,
                })
                .from(teamParticipants)
                .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
                .leftJoin(
                  participantCheckIns,
                  and(
                    eq(participantCheckIns.participantId, teamParticipants.id),
                    eq(participantCheckIns.round, round),
                  ),
                )
                .leftJoin(
                  checkedInByUser,
                  eq(checkedInByUser.id, participantCheckIns.checkedInByUserId),
                )
                .where(
                  inArray(
                    teams.id,
                    teamRows.map((team) => team.id),
                  ),
                )
                .orderBy(
                  ...createTableOrderBy({
                    columns: participantCheckInSortColumns,
                    fallbackSorting: defaultParticipantCheckInSorting,
                    sorting,
                    stableColumn: teamParticipants.id,
                  }),
                );
              for (const record of records) {
                const team = teamById.get(record.teamId);
                if (!team) {
                  continue;
                }
                team.members.push({
                  checkIn:
                    record.checkedInAt !== null && record.checkedInByName !== null
                      ? {
                          checkedInAt: record.checkedInAt,
                          checkedInByName: record.checkedInByName,
                          flag: record.flag,
                        }
                      : null,
                  email: record.email,
                  id: record.id,
                  name: participantName(record),
                });
              }
              return {
                rowCount: totalResult?.value ?? 0,
                rows: teamRows,
              };
            },
            { accessMode: "read only", isolationLevel: "repeatable read" },
          ),
      ),
    registerTeam: async (teamId, userId, round) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [team] = await transaction
              .select({ award: teams.award })
              .from(teams)
              .where(eq(teams.id, teamId))
              .for("update")
              .limit(1);
            if (!team) {
              return "TARGET_NOT_FOUND";
            }
            const [existing] = await transaction
              .select({ teamId: teamCheckIns.teamId })
              .from(teamCheckIns)
              .where(and(eq(teamCheckIns.teamId, teamId), eq(teamCheckIns.round, round)))
              .limit(1);
            if (existing) {
              return "ALREADY_CHECKED_IN";
            }
            if (team.award !== teamCheckInAwards[round].eligible) {
              return "NOT_ELIGIBLE";
            }
            await transaction
              .insert(teamCheckIns)
              .values({ checkedInByUserId: userId, round, teamId });
            await transaction
              .update(teams)
              .set({ award: teamCheckInAwards[round].participated })
              .where(eq(teams.id, teamId));
            return "CREATED";
          }),
      ),
    updateFlag: async (participantId, flag, round) =>
      await execute(async () => {
        const updated = await database
          .update(participantCheckIns)
          .set({ flag })
          .where(
            and(
              eq(participantCheckIns.participantId, participantId),
              eq(participantCheckIns.round, round),
            ),
          )
          .returning({ participantId: participantCheckIns.participantId });
        return updated.length > 0;
      }),
  };
}
