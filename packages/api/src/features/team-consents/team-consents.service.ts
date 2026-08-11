import { createError } from "evlog";
import type { TeamAccessContext } from "../../core/auth";

import { createTeamNotFoundError } from "../teams/teams.service";
import type {
  CreateTeamConsentRecordData,
  TeamConsentRepository,
  TeamConsentUpdateResult,
  UpdateTeamConsentRecordData,
} from "./team-consents.repository";
import type {
  CreateTeamConsentData,
  TeamConsent,
  UpdateTeamConsentData,
} from "./team-consents.schema";

export interface TeamConsentService {
  create: (access: TeamAccessContext, data: CreateTeamConsentData) => Promise<TeamConsent>;
  get: (access: TeamAccessContext, teamId: string) => Promise<TeamConsent>;
  update: (
    access: TeamAccessContext,
    teamId: string,
    data: UpdateTeamConsentData,
  ) => Promise<TeamConsentUpdateResult>;
}

export function createTeamConsentNotFoundError() {
  return createError({
    code: "TEAM_CONSENT_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team consent not found",
    status: 404,
    why: "No consent record accessible to the current user matches this team",
  });
}

function getConsentTimestamp(accepted: boolean, signedAt: Date): Date | null {
  return accepted ? signedAt : null;
}

function createConsentRecordData(
  data: CreateTeamConsentData,
  signedAt: Date,
): CreateTeamConsentRecordData {
  return {
    ...data,
    codernTermsAcceptedAt: getConsentTimestamp(data.codernTermsAccepted, signedAt),
    competitionRulesAcceptedAt: getConsentTimestamp(data.competitionRulesAccepted, signedAt),
    guardianConsentObtainedAt: getConsentTimestamp(data.guardianConsentObtained, signedAt),
    healthDataConsentAt: getConsentTimestamp(data.healthDataConsent, signedAt),
    privacyPolicyAcceptedAt: getConsentTimestamp(data.privacyPolicyAccepted, signedAt),
    publicityMediaConsentAt: getConsentTimestamp(data.publicityMediaConsent, signedAt),
  };
}

function createConsentUpdateData(
  data: UpdateTeamConsentData,
  signedAt: Date,
): UpdateTeamConsentRecordData {
  return {
    ...data,
    ...(data.codernTermsAccepted === undefined
      ? {}
      : { codernTermsAcceptedAt: getConsentTimestamp(data.codernTermsAccepted, signedAt) }),
    ...(data.competitionRulesAccepted === undefined
      ? {}
      : {
          competitionRulesAcceptedAt: getConsentTimestamp(data.competitionRulesAccepted, signedAt),
        }),
    ...(data.guardianConsentObtained === undefined
      ? {}
      : {
          guardianConsentObtainedAt: getConsentTimestamp(data.guardianConsentObtained, signedAt),
        }),
    ...(data.healthDataConsent === undefined
      ? {}
      : { healthDataConsentAt: getConsentTimestamp(data.healthDataConsent, signedAt) }),
    ...(data.privacyPolicyAccepted === undefined
      ? {}
      : { privacyPolicyAcceptedAt: getConsentTimestamp(data.privacyPolicyAccepted, signedAt) }),
    ...(data.publicityMediaConsent === undefined
      ? {}
      : {
          publicityMediaConsentAt: getConsentTimestamp(data.publicityMediaConsent, signedAt),
        }),
  };
}

export function createTeamConsentService(
  repository: TeamConsentRepository,
  now: () => Date = () => new Date(),
): TeamConsentService {
  return {
    create: async (access, data) => {
      const consent = await repository.create(access, createConsentRecordData(data, now()));
      if (!consent) {
        throw createTeamNotFoundError();
      }

      return consent;
    },
    get: async (access, teamId) => {
      const consent = await repository.findByTeamId(access, teamId);
      if (!consent) {
        throw createTeamConsentNotFoundError();
      }

      return consent;
    },
    update: async (access, teamId, data) => {
      const result = await repository.update(access, teamId, createConsentUpdateData(data, now()));
      if (!result) {
        throw createTeamConsentNotFoundError();
      }

      return result;
    },
  };
}
