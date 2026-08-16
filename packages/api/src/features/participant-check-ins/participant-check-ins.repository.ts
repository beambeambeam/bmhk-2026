import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { participantCheckIns } from "@bmhk-2026/db/schema/participant-check-ins";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { count, eq, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import { createTableOrderBy, createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { createRepositoryExecutor } from "../../core/repository";
import { getTableOffset } from "../../core/table-query";
import { participantCheckInRepositoryError } from "./participant-check-ins.errors";
import type {
  ParticipantCheckInColumnFilter,
  ParticipantCheckInFlag,
  ParticipantCheckInListQuery,
  ParticipantCheckInListResult,
  ParticipantCheckInSort,
} from "./participant-check-ins.schema";

export interface ParticipantCheckInRepository {
  cancel: (participantId: string) => Promise<boolean>;
  checkIn: (participantId: string, checkedInByUserId: string) => Promise<boolean | null>;
  list: (query: ParticipantCheckInListQuery) => Promise<ParticipantCheckInListResult>;
  updateFlag: (participantId: string, flag: ParticipantCheckInFlag | null) => Promise<boolean>;
}

type Database = typeof db;
const checkedInByUser = alias(user, "participant_checked_in_by_user");
const participantCheckInSortColumns = {
  checkedInAt: participantCheckIns.checkedInAt,
  email: teamParticipants.email,
  flag: participantCheckIns.flag,
  name: teamParticipants.firstNameTh,
  teamName: teams.name,
} as const;
const defaultParticipantCheckInSorting = [
  { desc: false, id: "name" },
] as const satisfies readonly ParticipantCheckInSort[];

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

function createParticipantCheckInFilterCondition(
  filter: ParticipantCheckInColumnFilter,
): SQL | undefined {
  if (filter.value.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(filter.value)}%`;
  if (filter.id === "email") {
    return ilike(teamParticipants.email, pattern);
  }
  if (filter.id === "teamName") {
    return ilike(teams.name, pattern);
  }
  return ilike(teamParticipants.firstNameTh, pattern);
}

export function createParticipantCheckInRepository(
  database: Database = db,
): ParticipantCheckInRepository {
  const execute = createRepositoryExecutor(participantCheckInRepositoryError);
  return {
    cancel: async (participantId) =>
      await execute(async () => {
        const cancelled = await database
          .delete(participantCheckIns)
          .where(eq(participantCheckIns.participantId, participantId))
          .returning({ participantId: participantCheckIns.participantId });
        return cancelled.length > 0;
      }),
    checkIn: async (participantId, checkedInByUserId) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [participant] = await transaction
              .select({ id: teamParticipants.id })
              .from(teamParticipants)
              .where(eq(teamParticipants.id, participantId))
              .for("update")
              .limit(1);
            if (!participant) {
              return null;
            }
            const created = await transaction
              .insert(participantCheckIns)
              .values({ checkedInByUserId, participantId })
              .onConflictDoNothing()
              .returning({ participantId: participantCheckIns.participantId });
            return created.length > 0;
          }),
      ),
    list: async ({ columnFilters, pagination, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const filters = createTableWhere(
                columnFilters,
                createParticipantCheckInFilterCondition,
              );
              const [totalResult] = await transaction
                .select({ value: count() })
                .from(teamParticipants)
                .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
                .where(filters);
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
                  teamName: teams.name,
                  titleTh: teamParticipants.titleTh,
                })
                .from(teamParticipants)
                .innerJoin(teams, eq(teams.id, teamParticipants.teamId))
                .leftJoin(
                  participantCheckIns,
                  eq(participantCheckIns.participantId, teamParticipants.id),
                )
                .leftJoin(
                  checkedInByUser,
                  eq(checkedInByUser.id, participantCheckIns.checkedInByUserId),
                )
                .where(filters)
                .orderBy(
                  ...createTableOrderBy({
                    columns: participantCheckInSortColumns,
                    fallbackSorting: defaultParticipantCheckInSorting,
                    sorting,
                    stableColumn: teamParticipants.id,
                  }),
                )
                .limit(pagination.pageSize)
                .offset(getTableOffset(pagination));
              return {
                rowCount: totalResult?.value ?? 0,
                rows: records.map((record) => ({
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
                  teamName: record.teamName,
                })),
              };
            },
            { accessMode: "read only", isolationLevel: "repeatable read" },
          ),
      ),
    updateFlag: async (participantId, flag) =>
      await execute(async () => {
        const updated = await database
          .update(participantCheckIns)
          .set({ flag })
          .where(eq(participantCheckIns.participantId, participantId))
          .returning({ participantId: participantCheckIns.participantId });
        return updated.length > 0;
      }),
  };
}
