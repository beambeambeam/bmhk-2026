import { createError } from "evlog";
import type { TeamAccessContext } from "../../core/auth";

import { createTeamNotFoundError } from "../teams/teams.service";
import type { TeamConsentRepository } from "./team-consents.repository";
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
  ) => Promise<TeamConsent>;
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

export function createTeamConsentService(repository: TeamConsentRepository): TeamConsentService {
  return {
    create: async (access, data) => {
      const consent = await repository.create(access, data);
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
      const consent = await repository.update(access, teamId, data);
      if (!consent) {
        throw createTeamConsentNotFoundError();
      }

      return consent;
    },
  };
}
