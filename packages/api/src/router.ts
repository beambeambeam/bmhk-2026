import type { RouterClient } from "@orpc/server";

import type { AuthReader } from "./core/auth";
import { createProcedures } from "./core/procedure";
import { createHealthRouter } from "./features/health/health.router";
import { createFileRepository } from "./features/files/files.repository";
import { createFilesRouter } from "./features/files/files.router";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";
import type { FileRepository } from "./features/files/files.repository";
import type { TeamRepository } from "./features/teams/teams.repository";
import { createTeamRepository } from "./features/teams/teams.repository";
import { createTeamsRouter } from "./features/teams/teams.router";
import type { TeamAdvisorRepository } from "./features/team-advisors/team-advisors.repository";
import { createTeamAdvisorRepository } from "./features/team-advisors/team-advisors.repository";
import { createTeamAdvisorsRouter } from "./features/team-advisors/team-advisors.router";
import type { TeamParticipantRepository } from "./features/team-participants/team-participants.repository";
import { createTeamParticipantRepository } from "./features/team-participants/team-participants.repository";
import { createTeamParticipantsRouter } from "./features/team-participants/team-participants.router";
import type { TeamConsentRepository } from "./features/team-consents/team-consents.repository";
import { createTeamConsentRepository } from "./features/team-consents/team-consents.repository";
import { createTeamConsentsRouter } from "./features/team-consents/team-consents.router";

export interface ApiDependencies {
  auth: AuthReader;
  /** Optional overrides keep feature tests isolated; production uses API-owned repositories. */
  files?: FileRepository;
  teams?: TeamRepository;
  teamAdvisors?: TeamAdvisorRepository;
  teamConsents?: TeamConsentRepository;
  teamParticipants?: TeamParticipantRepository;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const { protectedProcedure, publicProcedure } = createProcedures(dependencies);

  return {
    files: createFilesRouter(protectedProcedure, dependencies.files ?? createFileRepository()),
    health: createHealthRouter(publicProcedure),
    privateData: createPrivateDataRouter(protectedProcedure),
    teamAdvisors: createTeamAdvisorsRouter(
      protectedProcedure,
      dependencies.teamAdvisors ?? createTeamAdvisorRepository(),
    ),
    teamConsents: createTeamConsentsRouter(
      protectedProcedure,
      dependencies.teamConsents ?? createTeamConsentRepository(),
    ),
    teamParticipants: createTeamParticipantsRouter(
      protectedProcedure,
      dependencies.teamParticipants ?? createTeamParticipantRepository(),
    ),
    teams: createTeamsRouter(protectedProcedure, dependencies.teams ?? createTeamRepository()),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
