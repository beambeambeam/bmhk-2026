import { checkInRoundValues } from "@bmhk-2026/db/schema/check-in-round";

import { createRepositoryExecutor } from "../../core/repository";
import {
  createTeamRoundResultTeamNotFoundError,
  teamRoundResultRepositoryError,
} from "./team-round-results.errors";
import type { TeamRoundResultRepository } from "./team-round-results.repository";
import type {
  SaveTeamRoundResultInput,
  TeamRoundResult,
  TeamRoundResultList,
  TeamRoundResultListQuery,
  TeamRoundResultsDetail,
} from "./team-round-results.schema";

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
    list: async (query: TeamRoundResultListQuery): Promise<TeamRoundResultList> =>
      await execute(async () => await repository.list(query)),
    save: async (input: SaveTeamRoundResultInput): Promise<TeamRoundResult> => {
      const result = await execute(async () => await repository.save(input));
      if (!result) {
        throw createTeamRoundResultTeamNotFoundError();
      }
      return result;
    },
  };
}

export type TeamRoundResultService = ReturnType<typeof createTeamRoundResultService>;
