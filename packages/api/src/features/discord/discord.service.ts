import type { DiscordRepository } from "./discord.repository";
import type { DiscordQueryResponse, DiscordVerifyResponse } from "./discord.schema";
import { discordStatus } from "./discord.schema";

export interface DiscordService {
  query: (code: string) => Promise<DiscordQueryResponse>;
  verify: (code: string, discordUserId: string) => Promise<DiscordVerifyResponse>;
}

const TEAM_NAME_MAX_LENGTH = 17;

function toDisplayName(firstNameEn: string, lastNameEn: string): string {
  return `${firstNameEn} ${lastNameEn}`.trim();
}

function toNickname(params: {
  firstNameEn: string;
  teamIndex: number;
  teamName: string;
  wasAlt: boolean;
}): string {
  const cappedTeamName = params.teamName.slice(0, TEAM_NAME_MAX_LENGTH);
  const base = `${params.teamIndex} - ${cappedTeamName} - ${params.firstNameEn}`;
  return params.wasAlt ? `${base} [ALT]` : base;
}

export function createDiscordService(repository: DiscordRepository): DiscordService {
  return {
    query: async (code) => {
      const lookup = await repository.findByCode(code);
      if (!lookup) {
        return { data: null, status: discordStatus.NOT_FOUND };
      }

      if (lookup.discord.redeemedAt && lookup.discord.altRedeemedAt) {
        return { data: null, status: discordStatus.ALREADY_REDEEMED };
      }

      return {
        data: {
          main_acc_id: lookup.discord.mainAccUserId,
          name: toDisplayName(lookup.firstNameEn, lookup.lastNameEn),
          school: lookup.school,
          team: lookup.teamName,
        },
        status: discordStatus.SUCCESS,
      };
    },
    verify: async (code, discordUserId) => {
      const result = await repository.redeem(code, discordUserId);
      if (result.outcome === "not_found") {
        return { channel_id: null, nickname: null, status: discordStatus.NOT_FOUND };
      }

      if (result.outcome === "already_redeemed") {
        return { channel_id: null, nickname: null, status: discordStatus.ALREADY_REDEEMED };
      }

      return {
        channel_id: result.channelId,
        nickname: toNickname({
          firstNameEn: result.firstNameEn,
          teamIndex: result.teamIndex,
          teamName: result.teamName,
          wasAlt: result.wasAlt,
        }),
        status: discordStatus.SUCCESS,
      };
    },
  };
}
