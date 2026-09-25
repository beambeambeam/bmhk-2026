import type { RouterClient } from "@orpc/server";
import type { Temporal } from "temporal-polyfill";

import type { AuthReader } from "./core/auth";
import { createProcedures } from "./core/procedure";
import type { AdminUserRepository } from "./features/admin-users/admin-users.repository";
import { createAdminUserRepository } from "./features/admin-users/admin-users.repository";
import { createAdminUsersRouter } from "./features/admin-users/admin-users.router";
import { createAdminUserService } from "./features/admin-users/admin-users.service";
import type { ApiKeyRepository } from "./features/api-keys/api-keys.repository";
import { createApiKeyRepository } from "./features/api-keys/api-keys.repository";
import { createApiKeysRouter } from "./features/api-keys/api-keys.router";
import { createApiKeyService } from "./features/api-keys/api-keys.service";
import type { DiscordCodeRepository } from "./features/discord-codes/discord-codes.repository";
import { createDiscordCodeRepository } from "./features/discord-codes/discord-codes.repository";
import { createDiscordCodesRouter } from "./features/discord-codes/discord-codes.router";
import { createDiscordCodeService } from "./features/discord-codes/discord-codes.service";
import type { DiscordTeamGroupsRepository } from "./features/discord-team-groups/discord-team-groups.repository";
import { createDiscordTeamGroupsRepository } from "./features/discord-team-groups/discord-team-groups.repository";
import { createDiscordTeamGroupsAdminRouter } from "./features/discord-team-groups/discord-team-groups.router";
import { createDiscordTeamGroupsService } from "./features/discord-team-groups/discord-team-groups.service";
import { createHealthRouter } from "./features/health/health.router";
import { createFileRepository } from "./features/files/files.repository";
import { createFilesRouter } from "./features/files/files.router";
import { createFileService } from "./features/files/files.service";
import type { FileStorage } from "./features/files/files.storage";
import { createS3FileStorage } from "./features/files/files.storage";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";
import { createRound2ConfirmationRepository } from "./features/round2-confirmation/round2-confirmation.repository";
import type { Round2ConfirmationRepository } from "./features/round2-confirmation/round2-confirmation.repository";
import { createRound2ConfirmationService } from "./features/round2-confirmation/round2-confirmation.service";
import { createRound2ConfirmationRouter } from "./features/round2-confirmation/round2-confirmation.router";
import { createFeatureFlagsRouter } from "./features/feature-flags/feature-flags.router";
import { createFeatureFlagService } from "./features/feature-flags/feature-flags.service";
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
import type { TeamRegistrationReviewRepository } from "./features/team-registration-reviews/team-registration-reviews.repository";
import { createTeamRegistrationReviewRepository } from "./features/team-registration-reviews/team-registration-reviews.repository";
import { createTeamRegistrationReviewsRouter } from "./features/team-registration-reviews/team-registration-reviews.router";
import { createTeamRegistrationReviewService } from "./features/team-registration-reviews/team-registration-reviews.service";
import type { StaffCheckInRepository } from "./features/staff-check-ins/staff-check-ins.repository";
import { createStaffCheckInRepository } from "./features/staff-check-ins/staff-check-ins.repository";
import { createStaffCheckInsRouter } from "./features/staff-check-ins/staff-check-ins.router";
import { createStaffCheckInService } from "./features/staff-check-ins/staff-check-ins.service";
import type { ParticipantCheckInRepository } from "./features/participant-check-ins/participant-check-ins.repository";
import { createParticipantCheckInRepository } from "./features/participant-check-ins/participant-check-ins.repository";
import { createParticipantCheckInsRouter } from "./features/participant-check-ins/participant-check-ins.router";
import { createParticipantCheckInService } from "./features/participant-check-ins/participant-check-ins.service";
import type { StaffOverseersRepository } from "./features/staff-overseers/staff-overseers.repository";
import { createStaffOverseersRepository } from "./features/staff-overseers/staff-overseers.repository";
import { createStaffOverseersRouter } from "./features/staff-overseers/staff-overseers.router";
import { createStaffOverseersService } from "./features/staff-overseers/staff-overseers.service";
import type { StaffDiscordLinkService } from "./features/staff-discord-link/staff-discord-link.service";
import { createStaffDiscordLinkRouter } from "./features/staff-discord-link/staff-discord-link.router";
import type { TeamRoundResultRepository } from "./features/team-round-results/team-round-results.repository";
import { createTeamRoundResultRepository } from "./features/team-round-results/team-round-results.repository";
import { createTeamRoundResultsRouter } from "./features/team-round-results/team-round-results.router";
import { createTeamRoundResultService } from "./features/team-round-results/team-round-results.service";

export interface ApiDependencies {
  adminUsers?: AdminUserRepository;
  apiKeys?: ApiKeyRepository;
  auth: AuthReader;
  discordCodes?: DiscordCodeRepository;
  discordTeamGroups?: DiscordTeamGroupsRepository;
  featureFlagClock?: () => Temporal.Instant;
  fileStorage?: FileStorage;
  /** Optional overrides keep feature tests isolated; production uses API-owned repositories. */
  files?: FileRepository;
  round2Confirmation?: Round2ConfirmationRepository;
  teams?: TeamRepository;
  teamAdvisors?: TeamAdvisorRepository;
  teamConsents?: TeamConsentRepository;
  teamParticipants?: TeamParticipantRepository;
  teamRegistrationStatus?: TeamRegistrationStatusRepository;
  teamRegistrationReviews?: TeamRegistrationReviewRepository;
  teamRoundResults?: TeamRoundResultRepository;
  staffCheckIns?: StaffCheckInRepository;
  participantCheckIns?: ParticipantCheckInRepository;
  staffOverseers?: StaffOverseersRepository;
  staffDiscordLinkService: StaffDiscordLinkService;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const {
    academicProcedure,
    academicOrRegistrationProcedure,
    adminProcedure,
    protectedProcedure,
    publicProcedure,
    registrationProcedure,
    staffProcedure,
    teamAccessProcedure,
    teamRemovalProcedure,
    teamOwnerProcedure,
    userManagementProcedure,
  } = createProcedures(dependencies);
  const adminUserRepository = dependencies.adminUsers ?? createAdminUserRepository();
  const apiKeyRepository = dependencies.apiKeys ?? createApiKeyRepository();
  const discordCodeRepository = dependencies.discordCodes ?? createDiscordCodeRepository();
  const discordTeamGroupsRepository =
    dependencies.discordTeamGroups ?? createDiscordTeamGroupsRepository();
  const teamAdvisorRepository = dependencies.teamAdvisors ?? createTeamAdvisorRepository();
  const teamRepository = dependencies.teams ?? createTeamRepository();
  const teamParticipantRepository =
    dependencies.teamParticipants ?? createTeamParticipantRepository();
  const teamConsentRepository = dependencies.teamConsents ?? createTeamConsentRepository();
  const teamRegistrationStatusRepository =
    dependencies.teamRegistrationStatus ?? createTeamRegistrationStatusRepository();
  const teamRegistrationReviewRepository =
    dependencies.teamRegistrationReviews ?? createTeamRegistrationReviewRepository();
  const featureFlagService = createFeatureFlagService(dependencies.featureFlagClock);
  const fileRepository = dependencies.files ?? createFileRepository();
  const fileStorage = dependencies.fileStorage ?? createS3FileStorage();
  const staffCheckInRepository = dependencies.staffCheckIns ?? createStaffCheckInRepository();
  const participantCheckInRepository =
    dependencies.participantCheckIns ?? createParticipantCheckInRepository();
  const staffOverseersRepository = dependencies.staffOverseers ?? createStaffOverseersRepository();

  return {
    adminUsers: createAdminUsersRouter(
      userManagementProcedure,
      createAdminUserService(adminUserRepository),
    ),
    apiKeys: createApiKeysRouter(
      adminProcedure,
      createApiKeyService(apiKeyRepository, dependencies.auth),
    ),
    discordCodes: createDiscordCodesRouter(
      registrationProcedure,
      teamOwnerProcedure,
      createDiscordCodeService(discordCodeRepository),
    ),
    featureFlags: createFeatureFlagsRouter(publicProcedure, featureFlagService),
    files: createFilesRouter(protectedProcedure, createFileService(fileRepository, fileStorage)),
    health: createHealthRouter(publicProcedure),
    participantCheckIns: createParticipantCheckInsRouter(
      registrationProcedure,
      createParticipantCheckInService(participantCheckInRepository),
    ),
    privateData: createPrivateDataRouter(protectedProcedure),
    round2Confirmation: createRound2ConfirmationRouter(
      teamOwnerProcedure,
      registrationProcedure,
      teamAccessProcedure,
      createRound2ConfirmationService(
        dependencies.round2Confirmation ?? createRound2ConfirmationRepository(),
        fileStorage,
        fileRepository,
        featureFlagService,
      ),
    ),
    staffCheckIns: createStaffCheckInsRouter(
      staffProcedure,
      createStaffCheckInService(staffCheckInRepository),
    ),
    staffDiscordLink: createStaffDiscordLinkRouter(
      protectedProcedure,
      dependencies.staffDiscordLinkService,
    ),
    staffOverseers: createStaffOverseersRouter(
      adminProcedure,
      createStaffOverseersService(staffOverseersRepository),
    ),
    teamAdvisors: createTeamAdvisorsRouter(
      teamAccessProcedure,
      createTeamAdvisorService(teamAdvisorRepository, fileStorage, fileRepository),
    ),
    teamConsents: createTeamConsentsRouter(
      teamAccessProcedure,
      teamOwnerProcedure,
      createTeamConsentService(teamConsentRepository),
    ),
    teamGroups: createDiscordTeamGroupsAdminRouter(
      adminProcedure,
      createDiscordTeamGroupsService(discordTeamGroupsRepository),
    ),
    teamParticipants: createTeamParticipantsRouter(
      teamAccessProcedure,
      createTeamParticipantService(teamParticipantRepository, fileStorage, fileRepository),
    ),
    teamRegistrationReviews: createTeamRegistrationReviewsRouter(
      registrationProcedure,
      teamOwnerProcedure,
      createTeamRegistrationReviewService(teamRegistrationReviewRepository),
    ),
    teamRegistrationStatus: createTeamRegistrationStatusRouter(
      registrationProcedure,
      teamOwnerProcedure,
      createTeamRegistrationStatusService(teamRegistrationStatusRepository),
    ),
    teamRoundResults: createTeamRoundResultsRouter(
      academicProcedure,
      academicOrRegistrationProcedure,
      createTeamRoundResultService(
        dependencies.teamRoundResults ?? createTeamRoundResultRepository(),
      ),
    ),
    teams: createTeamsRouter(
      protectedProcedure,
      registrationProcedure,
      teamAccessProcedure,
      teamRemovalProcedure,
      createTeamService(teamRepository, fileStorage, fileRepository),
      featureFlagService,
    ),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
