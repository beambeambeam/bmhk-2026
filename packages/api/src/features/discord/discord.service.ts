import type { DiscordRepository } from "./discord.repository";
import { participantNicknameOf } from "./participant-nickname";
import type { DiscordQueryResponse, DiscordVerifyResponse } from "./discord.schema";
import { discordStatus } from "./discord.schema";

export interface DiscordService {
  query: (code: string) => Promise<DiscordQueryResponse>;
  verify: (code: string, discordUserId: string) => Promise<DiscordVerifyResponse>;
}

function toDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function createDiscordService(repository: DiscordRepository): DiscordService {
  return {
    query: async (code) => {
      const lookup = await repository.findByCode(code);
      if (!lookup) {
        return { data: null, status: discordStatus.NOT_FOUND };
      }

      if (lookup.discord.redeemedAt) {
        return { data: null, status: discordStatus.ALREADY_REDEEMED };
      }

      return {
        data: {
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
        nickname: participantNicknameOf({
          firstNameTh: result.firstNameTh,
          teamIndex: result.teamIndex,
          teamName: result.teamName,
        }),
        status: discordStatus.SUCCESS,
      };
    },
  };
}
