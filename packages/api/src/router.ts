import type { RouterClient } from "@orpc/server";

import type { AuthReader } from "./core/auth";
import { createProcedures } from "./core/procedure";
import { createHealthRouter } from "./features/health/health.router";
import { createFileRepository } from "./features/files/files.repository";
import { createFilesRouter } from "./features/files/files.router";
import { createFileService } from "./features/files/files.service";
import type { FileStorage } from "./features/files/files.storage";
import { createS3FileStorage } from "./features/files/files.storage";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";
import type { FileRepository } from "./features/files/files.repository";
import type { TeamRepository } from "./features/teams/teams.repository";
import { createTeamRepository } from "./features/teams/teams.repository";
import { createTeamsRouter } from "./features/teams/teams.router";
import { createTeamService } from "./features/teams/teams.service";
import type { TeamAdvisorRepository } from "./features/team-advisors/team-advisors.repository";
import { createTeamAdvisorRepository } from "./features/team-advisors/team-advisors.repository";
import { createTeamAdvisorsRouter } from "./features/team-advisors/team-advisors.router";
import { createTeamAdvisorService } from "./features/team-advisors/team-advisors.service";
import type { TeamParticipantRepository } from "./features/team-participants/team-participants.repository";
import { createTeamParticipantRepository } from "./features/team-participants/team-participants.repository";
import { createTeamParticipantsRouter } from "./features/team-participants/team-participants.router";
import { createTeamParticipantService } from "./features/team-participants/team-participants.service";
import type { TeamConsentRepository } from "./features/team-consents/team-consents.repository";
import { createTeamConsentRepository } from "./features/team-consents/team-consents.repository";
import { createTeamConsentsRouter } from "./features/team-consents/team-consents.router";
import { createTeamConsentService } from "./features/team-consents/team-consents.service";
import type { TeamRegistrationStatusRepository } from "./features/team-registration-status/team-registration-status.repository";
import { createTeamRegistrationStatusRepository } from "./features/team-registration-status/team-registration-status.repository";
import { createTeamRegistrationStatusRouter } from "./features/team-registration-status/team-registration-status.router";
import { createTeamRegistrationStatusService } from "./features/team-registration-status/team-registration-status.service";

export interface ApiDependencies {
  auth: AuthReader;
  fileStorage?: FileStorage;
  /** Optional overrides keep feature tests isolated; production uses API-owned repositories. */
  files?: FileRepository;
  teams?: TeamRepository;
  teamAdvisors?: TeamAdvisorRepository;
  teamConsents?: TeamConsentRepository;
  teamParticipants?: TeamParticipantRepository;
  teamRegistrationStatus?: TeamRegistrationStatusRepository;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const {
    protectedProcedure,
    publicProcedure,
    registrationProcedure,
    teamAccessProcedure,
    teamOwnerProcedure,
  } = createProcedures(dependencies);
  const teamAdvisorRepository = dependencies.teamAdvisors ?? createTeamAdvisorRepository();
  const teamRepository = dependencies.teams ?? createTeamRepository();
  const teamParticipantRepository =
    dependencies.teamParticipants ?? createTeamParticipantRepository();
  const teamConsentRepository = dependencies.teamConsents ?? createTeamConsentRepository();
  const teamRegistrationStatusRepository =
    dependencies.teamRegistrationStatus ?? createTeamRegistrationStatusRepository();
  const fileRepository = dependencies.files ?? createFileRepository();
  const fileStorage = dependencies.fileStorage ?? createS3FileStorage();

  return {
    files: createFilesRouter(protectedProcedure, createFileService(fileRepository, fileStorage)),
    health: createHealthRouter(publicProcedure),
    privateData: createPrivateDataRouter(protectedProcedure),
    teamAdvisors: createTeamAdvisorsRouter(
      teamAccessProcedure,
      createTeamAdvisorService(teamAdvisorRepository, fileStorage, fileRepository),
    ),
    teamConsents: createTeamConsentsRouter(
      teamAccessProcedure,
      teamOwnerProcedure,
      createTeamConsentService(teamConsentRepository),
    ),
    teamParticipants: createTeamParticipantsRouter(
      teamAccessProcedure,
      createTeamParticipantService(teamParticipantRepository, fileStorage, fileRepository),
    ),
    teamRegistrationStatus: createTeamRegistrationStatusRouter(
      teamAccessProcedure,
      createTeamRegistrationStatusService(teamRegistrationStatusRepository),
    ),
    teams: createTeamsRouter(
      protectedProcedure,
      registrationProcedure,
      teamAccessProcedure,
      teamOwnerProcedure,
      createTeamService(teamRepository, fileStorage, fileRepository),
    ),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
