import type { DiscordRepository } from "./discord.repository";
import type { DiscordQueryResponse, DiscordVerifyResponse } from "./discord.schema";
import { discordStatus } from "./discord.schema";

export interface DiscordService {
  query: (code: string) => Promise<DiscordQueryResponse>;
  verify: (code: string, discordUserId: string) => Promise<DiscordVerifyResponse>;
}

const TEAM_NAME_MAX_LENGTH = 17;
const TEAM_INDEX_PAD_LENGTH = 3;
const NICKNAME_MAX_LENGTH = 32;
const ALT_SUFFIX = " [A]";

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
          name: toDisplayName(lookup.firstNameTh, lookup.lastNameTh),
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

      if (result.outcome === "already_linked") {
        return { channel_id: null, nickname: null, status: discordStatus.ALREADY_LINKED };
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
  };
}
