import type { AcademicOrRegistrationProcedure, AcademicProcedure } from "../../core/procedure";
import { awardChangedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  getTeamRoundResultOutcomeSchema,
  getTeamRoundResultsSchema,
  listTeamRoundResultsSchema,
  saveTeamRoundResultSchema,
  setTeamRoundResultOutcomeSchema,
  teamRoundResultListSchema,
  teamRoundResultOutcomeSchema,
  teamRoundResultSchema,
  teamRoundResultsDetailSchema,
} from "./team-round-results.schema";
import type { TeamRoundResultService } from "./team-round-results.service";

export function createTeamRoundResultsRouter(
  academicProcedure: AcademicProcedure,
  academicOrRegistrationProcedure: AcademicOrRegistrationProcedure,
  service: TeamRoundResultService,
) {
  return {
    get: academicProcedure
      .route({ method: "GET", tags: ["Team Round Results"] })
      .input(getTeamRoundResultsSchema)
      .output(teamRoundResultsDetailSchema)
      .handler(async ({ input }) => await service.get(input.teamId)),
    getOutcome: academicOrRegistrationProcedure
      .route({ method: "GET", tags: ["Team Round Results", "Team Award"] })
      .input(getTeamRoundResultOutcomeSchema)
      .output(teamRoundResultOutcomeSchema)
      .handler(async ({ input }) => await service.getOutcome(input.teamId, input.round)),
    list: academicProcedure
      .route({ method: "GET", tags: ["Team Round Results"] })
      .input(listTeamRoundResultsSchema)
      .output(teamRoundResultListSchema)
      .handler(async ({ input }) => await service.list(input)),
    save: academicProcedure
      .route({ method: "PUT", tags: ["Team Round Results"] })
      .input(saveTeamRoundResultSchema)
      .output(teamRoundResultSchema)
      .handler(async ({ input }) => await service.save(input)),
    setOutcome: academicOrRegistrationProcedure
      .route({ method: "PATCH", tags: ["Team Round Results", "Team Award"] })
      .input(setTeamRoundResultOutcomeSchema)
      .output(teamRoundResultOutcomeSchema)
      .handler(async ({ context, input }) => {
        const result = await executeAudited({
          audit: awardChangedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.teamId, teamId: input.teamId },
          }),
          deniedErrorCodes: [
            "TEAM_ROUND_OUTCOME_CHECK_IN_REQUIRED",
            "TEAM_ROUND_OUTCOME_INVALID_TRANSITION",
            "TEAM_ROUND_OUTCOME_LATER_CHECK_IN",
            "TEAM_ROUND_OUTCOME_STALE",
            "TEAM_ROUND_RESULT_TEAM_NOT_FOUND",
          ],
          execute: async () => await service.setOutcome(input),
          log: context.log,
          onSuccess: ({ outcome, previousAward }) => ({
            changes: {
              after: { award: outcome.award },
              before: { award: previousAward },
            },
          }),
        });
        return result.outcome;
      }),
  };
}
