import { db } from "@bmhk-2026/db";
import { teamRoundResults } from "@bmhk-2026/db/schema/team-round-results";
import { teamCheckIns } from "@bmhk-2026/db/schema/team-check-ins";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { getTableOffset } from "../../core/table-query";
import type {
  SaveTeamRoundResultInput,
  TeamRoundResult,
  TeamRoundResultColumnFilter,
  TeamRoundResultList,
  TeamRoundResultListQuery,
  TeamRoundResultTeam,
} from "./team-round-results.schema";

export interface TeamRoundResultFacts {
  results: TeamRoundResult[];
  team: TeamRoundResultTeam;
}

export interface TeamRoundResultRepository {
  findByTeamId: (teamId: string) => Promise<TeamRoundResultFacts | null>;
  list: (query: TeamRoundResultListQuery) => Promise<TeamRoundResultList>;
  save: (input: SaveTeamRoundResultInput) => Promise<TeamRoundResult | null>;
}

const teamSelection = { id: teams.id, index: teams.index, name: teams.name };
const resultSelection = {
  completedAssignment: teamRoundResults.completedAssignment,
  createdAt: teamRoundResults.createdAt,
  lastSubmittedAt: teamRoundResults.lastSubmittedAt,
  round: teamRoundResults.round,
  score: teamRoundResults.score,
  teamId: teamRoundResults.teamId,
  totalSubmission: teamRoundResults.totalSubmission,
  updatedAt: teamRoundResults.updatedAt,
};
const sortColumns = {
  completedAssignment: teamRoundResults.completedAssignment,
  createdAt: teamRoundResults.createdAt,
  lastSubmittedAt: teamRoundResults.lastSubmittedAt,
  score: teamRoundResults.score,
  teamCode: teams.index,
  teamName: teams.name,
  totalSubmission: teamRoundResults.totalSubmission,
  updatedAt: teamRoundResults.updatedAt,
} as const;
const teamCodeSearchColumn = sql<string>`'BH' || lpad(
  ${teams.index}::text,
  greatest(3, length(${teams.index}::text)),
  '0'
) || '/26'`;

function createFilterCondition(filter: TeamRoundResultColumnFilter): SQL | undefined {
  if (filter.id === "teamCheckIn") {
    return isNotNull(teamCheckIns.teamId);
  }
  if (filter.value.length === 0) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(filter.value)}%`;
  return filter.id === "teamCode"
    ? ilike(teamCodeSearchColumn, pattern)
    : ilike(teams.name, pattern);
}

export function createTeamRoundResultRepository(
  database: typeof db = db,
): TeamRoundResultRepository {
  return {
    findByTeamId: async (teamId) => {
      const rows = await database
        .select({ result: resultSelection, team: teamSelection })
        .from(teams)
        .leftJoin(teamRoundResults, eq(teamRoundResults.teamId, teams.id))
        .where(eq(teams.id, teamId));
      const [first] = rows;
      if (!first) {
        return null;
      }
      return {
        results: rows.flatMap(({ result }) => (result === null ? [] : [result])),
        team: first.team,
      };
    },
    list: async ({ columnFilters, pagination, round, sorting }) =>
      await database.transaction(
        async (transaction) => {
          const filters = createTableWhere(columnFilters, createFilterCondition);
          const checkInJoin = and(eq(teamCheckIns.teamId, teams.id), eq(teamCheckIns.round, round));
          const [total] = await transaction
            .select({ value: count() })
            .from(teams)
            .leftJoin(teamCheckIns, checkInJoin)
            .where(filters);
          const orderBy = sorting.map(({ id, desc: descending }) => {
            const column = sortColumns[id];
            return sql`${descending ? desc(column) : asc(column)} nulls last`;
          });
          const rows = await transaction
            .select({ result: resultSelection, team: teamSelection })
            .from(teams)
            .leftJoin(teamCheckIns, checkInJoin)
            .leftJoin(
              teamRoundResults,
              and(eq(teamRoundResults.teamId, teams.id), eq(teamRoundResults.round, round)),
            )
            .where(filters)
            .orderBy(...orderBy, asc(teams.index))
            .limit(pagination.pageSize)
            .offset(getTableOffset(pagination));
          return {
            rowCount: total?.value ?? 0,
            rows: rows.map((row) => ({ ...row, round })),
          };
        },
        { accessMode: "read only", isolationLevel: "repeatable read" },
      ),
    save: async (input) =>
      await database.transaction(async (transaction) => {
        // Hold the Team against deletion until its result is saved. The result itself
        // is inserted or replaced in one statement, including concurrent first saves.
        const [team] = await transaction
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.id, input.teamId))
          .for("key share");
        if (!team) {
          return null;
        }
        const { completedAssignment, lastSubmittedAt, score, totalSubmission } = input;
        const [result] = await transaction
          .insert(teamRoundResults)
          .values(input)
          .onConflictDoUpdate({
            set: {
              completedAssignment,
              lastSubmittedAt,
              score,
              totalSubmission,
              updatedAt: sql`clock_timestamp()`,
            },
            target: [teamRoundResults.teamId, teamRoundResults.round],
          })
          .returning(resultSelection);
        if (!result) {
          throw new Error("Saving a team round result returned no record");
        }
        return result;
      }),
  };
}
