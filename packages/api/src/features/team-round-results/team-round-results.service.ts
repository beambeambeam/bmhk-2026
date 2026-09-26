import { checkInRoundValues } from "@bmhk-2026/db/schema/check-in-round";

import { createRepositoryExecutor } from "../../core/repository";
import {
  createTeamRoundOutcomeCheckInRequiredError,
  createTeamRoundOutcomeInvalidTransitionError,
  createTeamRoundOutcomeLaterCheckInError,
  createTeamRoundOutcomeStaleError,
  createTeamRoundResultTeamNotFoundError,
  teamRoundResultRepositoryError,
} from "./team-round-results.errors";
import type {
  SetTeamRoundOutcomeResult,
  TeamRoundOutcomeFacts,
  TeamRoundResultRepository,
} from "./team-round-results.repository";
import type {
  SaveTeamRoundResultInput,
  SetTeamRoundResultOutcomeInput,
  TeamRoundResult,
  TeamRoundResultList,
  TeamRoundResultListQuery,
  TeamRoundResultOutcome,
  TeamRoundResultRound,
  TeamRoundResultsDetail,
} from "./team-round-results.schema";
import {
  teamRoundOutcomeCanAdvance,
  teamRoundOutcomeCanRemoveFinalAward,
  teamRoundOutcomeCanRevert,
  teamRoundOutcomeCanSetFinalAward,
} from "./team-round-results.outcome";

function createTeamRoundResultOutcome(facts: TeamRoundOutcomeFacts): TeamRoundResultOutcome {
  return {
    actions: {
      canAdvance: teamRoundOutcomeCanAdvance(facts),
      canRemoveFinalAward: teamRoundOutcomeCanRemoveFinalAward(facts),
      canRevert: teamRoundOutcomeCanRevert(facts),
      canSetFinalAward: teamRoundOutcomeCanSetFinalAward(facts),
      hasLaterRoundCheckIns: facts.hasLaterRoundCheckIns,
    },
    award: facts.award,
    round: facts.round,
    team: facts.team,
  };
}

function throwForOutcomeFailure(
  result: Exclude<SetTeamRoundOutcomeResult, { status: "UPDATED" }>,
): never {
  if (result.status === "TEAM_NOT_FOUND") {
    throw createTeamRoundResultTeamNotFoundError();
  }
  if (result.status === "ROUND_CHECK_IN_REQUIRED") {
    throw createTeamRoundOutcomeCheckInRequiredError();
  }
  if (result.status === "STALE") {
    throw createTeamRoundOutcomeStaleError();
  }
  if (result.status === "LATER_ROUND_CHECK_IN") {
    throw createTeamRoundOutcomeLaterCheckInError();
  }
  throw createTeamRoundOutcomeInvalidTransitionError();
}

export function createTeamRoundResultService(repository: TeamRoundResultRepository) {
  const execute = createRepositoryExecutor(teamRoundResultRepositoryError);
  return {
    get: async (teamId: string): Promise<TeamRoundResultsDetail> => {
      const facts = await execute(async () => await repository.findByTeamId(teamId));
      if (!facts) {
        throw createTeamRoundResultTeamNotFoundError();
      }
      return {
        rounds: checkInRoundValues.map((round) => ({
          result: facts.results.find((result) => result.round === round) ?? null,
          round,
        })),
        team: facts.team,
      };
    },
    getOutcome: async (
      teamId: string,
      round: TeamRoundResultRound,
    ): Promise<TeamRoundResultOutcome> => {
      const facts = await execute(async () => await repository.findOutcome(teamId, round));
      if (!facts) {
        throw createTeamRoundResultTeamNotFoundError();
      }
      if (!facts.hasRoundCheckIn) {
        throw createTeamRoundOutcomeCheckInRequiredError();
      }
      return createTeamRoundResultOutcome(facts);
    },
    list: async (query: TeamRoundResultListQuery): Promise<TeamRoundResultList> =>
      await execute(async () => await repository.list(query)),
    save: async (input: SaveTeamRoundResultInput): Promise<TeamRoundResult> => {
      const result = await execute(async () => await repository.save(input));
      if (!result) {
        throw createTeamRoundResultTeamNotFoundError();
      }
      return result;
    },
    setOutcome: async (
      input: SetTeamRoundResultOutcomeInput,
    ): Promise<{
      outcome: TeamRoundResultOutcome;
      previousAward: TeamRoundResultOutcome["award"];
    }> => {
      const result = await execute(async () => await repository.setOutcome(input));
      if (result.status !== "UPDATED") {
        return throwForOutcomeFailure(result);
      }
      return {
        outcome: createTeamRoundResultOutcome(result.outcome),
        previousAward: result.previousAward,
      };
    },
  };
}

export type TeamRoundResultService = ReturnType<typeof createTeamRoundResultService>;
