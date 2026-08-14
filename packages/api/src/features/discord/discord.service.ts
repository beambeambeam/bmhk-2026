import type { DiscordRepository } from "./discord.repository";
import type { DiscordQueryResponse, DiscordVerifyResponse } from "./discord.schema";
import { discordStatus } from "./discord.schema";

export interface DiscordService {
  query: (code: string) => Promise<DiscordQueryResponse>;
  verify: (code: string, discordUserId: string) => Promise<DiscordVerifyResponse>;
}

function toDisplayName(firstNameEn: string, lastNameEn: string): string {
  return `${firstNameEn} ${lastNameEn}`.trim();
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
        return { nickname: null, status: discordStatus.NOT_FOUND };
      }

      if (result.outcome === "already_redeemed") {
        return { nickname: null, status: discordStatus.ALREADY_REDEEMED };
      }

      const name = toDisplayName(result.firstNameEn, result.lastNameEn);

      return {
        nickname: result.wasAlt ? `${name} [ALT]` : name,
        status: discordStatus.SUCCESS,
      };
    },
  };
}
