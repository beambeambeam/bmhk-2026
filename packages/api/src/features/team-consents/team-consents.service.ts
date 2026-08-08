import { createError } from "evlog";

import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamConsentRepository } from "./team-consents.repository";
import type {
  CreateTeamConsentData,
  TeamConsent,
  UpdateTeamConsentData,
} from "./team-consents.schema";

export interface TeamConsentService {
  create: (userId: string, data: CreateTeamConsentData) => Promise<TeamConsent>;
  get: (userId: string, teamId: string) => Promise<TeamConsent>;
  update: (userId: string, teamId: string, data: UpdateTeamConsentData) => Promise<TeamConsent>;
}

export function createTeamConsentAlreadyExistsError() {
  return createError({
    code: "TEAM_CONSENT_ALREADY_EXISTS",
    fix: "Use the existing team consent or update it instead",
    message: "Team already has a consent record",
    status: 409,
    why: "Each team may have only one consent record",
  });
}

export function createTeamConsentNotFoundError() {
  return createError({
    code: "TEAM_CONSENT_NOT_FOUND",
    fix: "Check the team ID and try again",
    message: "Team consent not found",
    status: 404,
    why: "No consent record owned by the current user matches this team",
  });
}

export function createTeamConsentRepositoryError() {
  return createError({
    code: "TEAM_CONSENT_REPOSITORY_ERROR",
    fix: "Try again or contact support",
    message: "Team consent operation failed",
    status: 500,
    why: "The team consent repository could not satisfy an internal invariant",
  });
}

export function createTeamConsentService(repository: TeamConsentRepository): TeamConsentService {
  return {
    create: async (userId, data) => {
      const consent = await repository.create(userId, data);
      if (!consent) {
        throw createTeamNotFoundError();
      }

      return consent;
    },
    get: async (userId, teamId) => {
      const consent = await repository.findByTeamId(userId, teamId);
      if (!consent) {
        throw createTeamConsentNotFoundError();
      }

      return consent;
    },
    update: async (userId, teamId, data) => {
      const consent = await repository.update(userId, teamId, data);
      if (!consent) {
        throw createTeamConsentNotFoundError();
      }

      return consent;
    },
  };
}
