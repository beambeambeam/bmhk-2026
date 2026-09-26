import { db } from "@bmhk-2026/db";
import { participantCheckIns } from "@bmhk-2026/db/schema/participant-check-ins";
import { teamRoundResults } from "@bmhk-2026/db/schema/team-round-results";
import { teamCheckIns } from "@bmhk-2026/db/schema/team-check-ins";
import { teamParticipants } from "@bmhk-2026/db/schema/team-participants";
import { teams } from "@bmhk-2026/db/schema/teams";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { getTableOffset } from "../../core/table-query";
import type {
  SaveTeamRoundResultInput,
  SetTeamRoundResultOutcomeInput,
  TeamRoundResult,
  TeamRoundResultAward,
  TeamRoundResultColumnFilter,
  TeamRoundResultList,
  TeamRoundResultListQuery,
  TeamRoundResultRound,
  TeamRoundResultTeam,
} from "./team-round-results.schema";
import { resolveTeamRoundOutcomeTransition } from "./team-round-results.outcome";
import type { TeamRoundOutcomeState } from "./team-round-results.outcome";

export interface TeamRoundOutcomeFacts extends TeamRoundOutcomeState {
  team: TeamRoundResultTeam;
}

export type SetTeamRoundOutcomeResult =
  | { outcome: TeamRoundOutcomeFacts; previousAward: TeamRoundResultAward; status: "UPDATED" }
  | { status: "TEAM_NOT_FOUND" }
  | { status: "ROUND_CHECK_IN_REQUIRED" }
  | { status: "STALE" }
  | { status: "LATER_ROUND_CHECK_IN" }
  | { status: "INVALID_TRANSITION" };

export interface TeamRoundResultFacts {
  results: TeamRoundResult[];
  team: TeamRoundResultTeam;
}

export interface TeamRoundResultRepository {
  findByTeamId: (teamId: string) => Promise<TeamRoundResultFacts | null>;
  findOutcome: (
    teamId: string,
    round: TeamRoundResultRound,
  ) => Promise<TeamRoundOutcomeFacts | null>;
  list: (query: TeamRoundResultListQuery) => Promise<TeamRoundResultList>;
  save: (input: SaveTeamRoundResultInput) => Promise<TeamRoundResult | null>;
  setOutcome: (input: SetTeamRoundResultOutcomeInput) => Promise<SetTeamRoundOutcomeResult>;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

function getLaterRounds(round: TeamRoundResultRound): readonly TeamRoundResultRound[] {
  if (round === "ROUND_1") {
    return ["ROUND_2", "ROUND_3"];
  }
  if (round === "ROUND_2") {
    return ["ROUND_3"];
  }
  return [];
}

async function hasLaterRoundCheckIns(
  transaction: Transaction,
  teamId: string,
  round: TeamRoundResultRound,
): Promise<boolean> {
  const laterRounds = getLaterRounds(round);
  const [laterTeamCheckIn] =
    laterRounds.length === 0
      ? []
      : await transaction
          .select({ teamId: teamCheckIns.teamId })
          .from(teamCheckIns)
          .where(and(eq(teamCheckIns.teamId, teamId), inArray(teamCheckIns.round, laterRounds)))
          .limit(1);
  const [laterParticipantCheckIn] =
    laterRounds.length === 0
      ? []
      : await transaction
          .select({ participantId: participantCheckIns.participantId })
          .from(participantCheckIns)
          .innerJoin(teamParticipants, eq(teamParticipants.id, participantCheckIns.participantId))
          .where(
            and(
              eq(teamParticipants.teamId, teamId),
              inArray(participantCheckIns.round, laterRounds),
            ),
          )
          .limit(1);
  return Boolean(laterTeamCheckIn ?? laterParticipantCheckIn);
}

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
    findOutcome: async (teamId, round) =>
      await database.transaction(async (transaction) => {
        const [team] = await transaction
          .select({ ...teamSelection, award: teams.award })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
        if (!team) {
          return null;
        }

        const [roundCheckIn] = await transaction
          .select({ teamId: teamCheckIns.teamId })
          .from(teamCheckIns)
          .where(and(eq(teamCheckIns.teamId, teamId), eq(teamCheckIns.round, round)))
          .limit(1);
        const hasLaterCheckIns = await hasLaterRoundCheckIns(transaction, teamId, round);

        return {
          award: team.award,
          hasLaterRoundCheckIns: hasLaterCheckIns,
          hasRoundCheckIn: Boolean(roundCheckIn),
          round,
          team: { id: team.id, index: team.index, name: team.name },
        };
      }),
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
    setOutcome: async (input) =>
      await database.transaction(async (transaction) => {
        const [team] = await transaction
          .select({ ...teamSelection, award: teams.award })
          .from(teams)
          .where(eq(teams.id, input.teamId))
          .for("update")
          .limit(1);
        if (!team) {
          return { status: "TEAM_NOT_FOUND" };
        }

        const [roundCheckIn] = await transaction
          .select({ teamId: teamCheckIns.teamId })
          .from(teamCheckIns)
          .where(and(eq(teamCheckIns.teamId, input.teamId), eq(teamCheckIns.round, input.round)))
          .limit(1);
        if (!roundCheckIn) {
          return { status: "ROUND_CHECK_IN_REQUIRED" };
        }
        if (team.award !== input.expectedAward) {
          return { status: "STALE" };
        }

        const hasLaterCheckIns = await hasLaterRoundCheckIns(
          transaction,
          input.teamId,
          input.round,
        );
        const previousAward = team.award;
        const transition = resolveTeamRoundOutcomeTransition(
          {
            award: team.award,
            hasLaterRoundCheckIns: hasLaterCheckIns,
            hasRoundCheckIn: true,
            round: input.round,
          },
          input.action,
        );
        if (transition.status === "LATER_ROUND_CHECK_IN") {
          return { status: "LATER_ROUND_CHECK_IN" };
        }
        if (transition.status !== "UPDATED") {
          return { status: "INVALID_TRANSITION" };
        }

        const [updatedTeam] = await transaction
          .update(teams)
          .set({ award: transition.award })
          .where(eq(teams.id, team.id))
          .returning({ ...teamSelection, award: teams.award });
        if (!updatedTeam) {
          throw new Error("Updating a Team outcome returned no row");
        }

        const outcome = {
          award: updatedTeam.award,
          hasLaterRoundCheckIns: hasLaterCheckIns,
          hasRoundCheckIn: true,
          round: input.round,
          team: { id: updatedTeam.id, index: updatedTeam.index, name: updatedTeam.name },
        } satisfies TeamRoundOutcomeFacts;
        return { outcome, previousAward, status: "UPDATED" };
      }),
  };
}
