import { randomInt } from "node:crypto";

import { createTeamNotFoundError } from "../teams/teams.service";
import type { FeatureFlagService } from "../feature-flags/feature-flags.service";
import {
  createDiscordCodesClosedError,
  createDiscordCodesRepositoryError,
  createDiscordCodesTeamNotEligibleError,
} from "./discord-codes.errors";
import type { DiscordCodeRepository, DiscordCodeTeamFacts } from "./discord-codes.repository";
import type { DiscordCodeEntry, DiscordCodeStatus } from "./discord-codes.schema";

export interface DiscordCodeService {
  getOrCreateForOwner: (ownerId: string) => Promise<DiscordCodeEntry[]>;
  getForTeam: (teamId: string) => Promise<DiscordCodeEntry[]>;
}

// No O/0/I/1/L: codes get typed into a Discord bot by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
// Retries cover a code colliding with another participant's, or a concurrent first call.
const MAX_GENERATION_ATTEMPTS = 3;
const INELIGIBLE_AWARDS = new Set(["NO_ACHIEVEMENT", "NOT_QUALIFIED"]);

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function isEligible(facts: DiscordCodeTeamFacts): boolean {
  return !INELIGIBLE_AWARDS.has(facts.award) && facts.reviewStatus === "APPROVED";
}

function toStatus(participant: DiscordCodeTeamFacts["participants"][number]): DiscordCodeStatus {
  if (participant.code === null) {
    return "NOT_GENERATED";
  }
  if (participant.redeemedAt !== null && participant.altRedeemedAt !== null) {
    return "REDEEMED_TWICE";
  }
  return participant.redeemedAt === null && participant.altRedeemedAt === null
    ? "NOT_REDEEMED"
    : "REDEEMED_ONCE";
}

function toEntries(facts: DiscordCodeTeamFacts): DiscordCodeEntry[] {
  return facts.participants.map((participant) => ({
    code: participant.code,
    name: [
      participant.titleTh,
      participant.firstNameTh,
      participant.middleNameTh,
      participant.lastNameTh,
    ]
      .filter(Boolean)
      .join(" "),
    participantIndex: participant.index,
    status: toStatus(participant),
  }));
}

function requireEligible(facts: DiscordCodeTeamFacts | null): DiscordCodeTeamFacts {
  if (facts === null) {
    throw createTeamNotFoundError();
  }
  if (!isEligible(facts)) {
    throw createDiscordCodesTeamNotEligibleError();
  }
  return facts;
}

function isCodeGenerationOpen(featureFlagService: FeatureFlagService): boolean {
  const flags = featureFlagService.getAll();
  return flags.eligibleTeamsAnnouncement && flags.qualifyingRoundIdentityConfirmation;
}

export function createDiscordCodeService(
  repository: DiscordCodeRepository,
  featureFlagService: FeatureFlagService,
): DiscordCodeService {
  async function fillMissingCodes(
    ownerId: string,
    facts: DiscordCodeTeamFacts,
    attemptsLeft: number,
  ): Promise<DiscordCodeTeamFacts> {
    const missing = facts.participants.filter((participant) => participant.code === null);
    if (missing.length === 0) {
      return facts;
    }
    if (attemptsLeft === 0) {
      throw createDiscordCodesRepositoryError(new Error("Discord codes could not be generated"));
    }

    await repository.insertMissing(
      missing.map((participant) => ({ code: generateCode(), participantId: participant.id })),
    );
    const refreshed = requireEligible(await repository.findByOwnerId(ownerId));
    return await fillMissingCodes(ownerId, refreshed, attemptsLeft - 1);
  }

  return {
    getForTeam: async (teamId) => toEntries(requireEligible(await repository.findByTeamId(teamId))),
    getOrCreateForOwner: async (ownerId) => {
      if (!isCodeGenerationOpen(featureFlagService)) {
        throw createDiscordCodesClosedError();
      }

      const facts = requireEligible(await repository.findByOwnerId(ownerId));
      return toEntries(await fillMissingCodes(ownerId, facts, MAX_GENERATION_ATTEMPTS));
    },
  };
}
