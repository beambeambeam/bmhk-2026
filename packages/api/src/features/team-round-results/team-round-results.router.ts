import type { AcademicProcedure } from "../../core/procedure";
import {
  getTeamRoundResultsSchema,
  listTeamRoundResultsSchema,
  saveTeamRoundResultSchema,
  teamRoundResultListSchema,
  teamRoundResultSchema,
  teamRoundResultsDetailSchema,
} from "./team-round-results.schema";
import type { TeamRoundResultService } from "./team-round-results.service";

export function createTeamRoundResultsRouter(
  academicProcedure: AcademicProcedure,
  service: TeamRoundResultService,
) {
  return {
    get: academicProcedure
      .route({ method: "GET", tags: ["Team Round Results"] })
      .input(getTeamRoundResultsSchema)
      .output(teamRoundResultsDetailSchema)
      .handler(async ({ input }) => await service.get(input.teamId)),
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
  };
}
