import {
  discordVerificationQueriedAudit,
  discordVerificationRedeemedAudit,
} from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import type { ApiContext } from "../../core/context";
import type { FeatureFlagService } from "../feature-flags/feature-flags.service";
import type { DiscordRepository } from "./discord.repository";
import type { DiscordQueryResponse, DiscordVerifyResponse } from "./discord.schema";
import { discordStatus } from "./discord.schema";

export interface DiscordAuditContext {
  actorId: string;
  log: ApiContext["log"];
}

export interface DiscordService {
  query: (code: string, auditContext: DiscordAuditContext) => Promise<DiscordQueryResponse>;
  verify: (
    code: string,
    discordUserId: string,
    auditContext: DiscordAuditContext,
  ) => Promise<DiscordVerifyResponse>;
}

const TEAM_NAME_MAX_LENGTH = 17;
const TEAM_INDEX_PAD_LENGTH = 3;
const NICKNAME_MAX_LENGTH = 32;
const ALT_SUFFIX = " [A]";
const INELIGIBLE_AWARDS = new Set(["NO_ACHIEVEMENT", "NOT_QUALIFIED"]);

function isConfirmationOpen(featureFlagService: FeatureFlagService): boolean {
  const flags = featureFlagService.getAll();
  return flags.eligibleTeamsAnnouncement && flags.qualifyingRoundIdentityConfirmation;
}

function isEligibleLookup(lookup: { award: string; reviewStatus: string | null }): boolean {
  return !INELIGIBLE_AWARDS.has(lookup.award) && lookup.reviewStatus === "APPROVED";
}

function reasonForStatus(status: number): string | undefined {
  switch (status) {
    case discordStatus.NOT_FOUND: {
      return "CODE_NOT_FOUND";
    }
    case discordStatus.ALREADY_REDEEMED: {
      return "CODE_ALREADY_REDEEMED";
    }
    case discordStatus.ALREADY_LINKED: {
      return "DISCORD_USER_ALREADY_LINKED";
    }
    case discordStatus.CLOSED: {
      return "DISCORD_VERIFICATION_CLOSED";
    }
    case discordStatus.INELIGIBLE: {
      return "DISCORD_TEAM_INELIGIBLE";
    }
    default: {
      return undefined;
    }
  }
}

async function executeWithAudit<Result extends { status: number }>(params: {
  auditContext: DiscordAuditContext;
  audit: (input: {
    actor: { id: string; type: "api" };
    target: { id: string };
  }) => Parameters<typeof executeAudited<Result>>[0]["audit"];
  execute: () => Promise<Result>;
  onSuccess?: (result: Result) => { changes?: { after?: unknown } };
  targetId?: string;
}): Promise<Result> {
  return await executeAudited({
    audit: params.audit({
      actor: { id: params.auditContext.actorId, type: "api" },
      target: { id: params.targetId ?? "discord-verification" },
    }),
    execute: params.execute,
    log: params.auditContext.log,
    onSuccess: (result) => ({
      ...params.onSuccess?.(result),
      outcome: result.status === discordStatus.SUCCESS ? "success" : "denied",
      reason: reasonForStatus(result.status),
    }),
  });
}

function toDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toNickname(params: {
  firstNameTh: string;
  teamIndex: number;
  teamName: string;
  wasAlt: boolean;
}): string {
  const cappedTeamName = params.teamName.slice(0, TEAM_NAME_MAX_LENGTH);
  const prefix = `${String(params.teamIndex).padStart(TEAM_INDEX_PAD_LENGTH, "0")}-${cappedTeamName}-`;
  const suffix = params.wasAlt ? ALT_SUFFIX : "";
  const nameBudget = Math.max(0, NICKNAME_MAX_LENGTH - prefix.length - suffix.length);
  return `${prefix}${params.firstNameTh.slice(0, nameBudget)}${suffix}`;
}

export function createDiscordService(
  repository: DiscordRepository,
  featureFlagService: FeatureFlagService,
): DiscordService {
  return {
    query: async (code, auditContext) =>
      await executeWithAudit({
        audit: discordVerificationQueriedAudit,
        auditContext,
        execute: async () => {
          if (!isConfirmationOpen(featureFlagService)) {
            return { data: null, status: discordStatus.CLOSED };
          }

          const lookup = await repository.findByCode(code);
          if (!lookup) {
            return { data: null, status: discordStatus.NOT_FOUND };
          }

          if (!isEligibleLookup(lookup)) {
            return { data: null, status: discordStatus.INELIGIBLE };
          }

          if (lookup.discord.redeemedAt && lookup.discord.altRedeemedAt) {
            return { data: null, status: discordStatus.ALREADY_REDEEMED };
          }

          return {
            data: {
              main_acc_id: lookup.discord.mainAccUserId,
              name: toDisplayName(lookup.firstNameTh, lookup.lastNameTh),
              school: lookup.school,
              team: lookup.teamName,
            },
            status: discordStatus.SUCCESS,
          };
        },
      }),
    verify: async (code, discordUserId, auditContext) =>
      await executeWithAudit({
        audit: discordVerificationRedeemedAudit,
        auditContext,
        execute: async () => {
          if (!isConfirmationOpen(featureFlagService)) {
            return { channel_id: null, nickname: null, status: discordStatus.CLOSED };
          }

          const result = await repository.redeem(code, discordUserId);
          if (result.outcome === "not_found") {
            return { channel_id: null, nickname: null, status: discordStatus.NOT_FOUND };
          }

          if (result.outcome === "already_redeemed") {
            return { channel_id: null, nickname: null, status: discordStatus.ALREADY_REDEEMED };
          }

          if (result.outcome === "already_linked") {
            return { channel_id: null, nickname: null, status: discordStatus.ALREADY_LINKED };
          }

          if (result.outcome === "ineligible") {
            return { channel_id: null, nickname: null, status: discordStatus.INELIGIBLE };
          }

          return {
            channel_id: result.channelId,
            nickname: toNickname({
              firstNameTh: result.firstNameTh,
              teamIndex: result.teamIndex,
              teamName: result.teamName,
              wasAlt: result.wasAlt,
            }),
            status: discordStatus.SUCCESS,
          };
        },
        onSuccess: (result) =>
          result.status === discordStatus.SUCCESS
            ? { changes: { after: { status: "REDEEMED" } } }
            : {},
        targetId: discordUserId,
      }),
  };
}
