import type { DiscordBotGateway } from "./discord-bot-gateway";
import type { StaffDiscordLinkRepository } from "./staff-discord-link.repository";
import type { StaffDiscordLinkResult } from "./staff-discord-link.schema";

const INELIGIBLE_ROLE = "user";
const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface LinkStaffDiscordParams {
  token: string;
  userId: string;
  userName: string;
  userRole: string | null | undefined;
}

export interface StaffDiscordLinkService {
  createToken: (discordUserId: string) => Promise<{ expiresAt: Date; token: string }>;
  link: (params: LinkStaffDiscordParams) => Promise<StaffDiscordLinkResult>;
}

function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  return spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
}

export function createStaffDiscordLinkService(
  repository: StaffDiscordLinkRepository,
  gateway: DiscordBotGateway,
): StaffDiscordLinkService {
  return {
    createToken: async (discordUserId) => await repository.createToken(discordUserId),
    link: async ({ token, userId, userName, userRole }) => {
      const role = userRole ?? INELIGIBLE_ROLE;
      if (role === INELIGIBLE_ROLE) {
        return { status: "INELIGIBLE_ROLE" };
      }

      const consumed = await repository.consumeToken(token);
      if (!consumed) {
        return { status: "INVALID_TOKEN" };
      }
      const { discordUserId } = consumed;

      const linkedToDiscordUser = await repository.findLinkByDiscordUserId(discordUserId);
      if (linkedToDiscordUser && linkedToDiscordUser.userId !== userId) {
        return { status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" };
      }

      const linkedToUser = await repository.findLinkByUserId(userId);
      if (linkedToUser && linkedToUser.discordUserId !== discordUserId) {
        return { status: "ALREADY_LINKED_TO_ANOTHER_ACCOUNT" };
      }

      const isAdmin = ADMIN_ROLES.has(role);
      const overseerGroup = isAdmin ? null : await repository.findOverseerGroup(userId);

      let categoryId: string | null = null;
      let nickname: string;
      if (isAdmin) {
        nickname = `[Admin] ${firstNameOf(userName)}`;
      } else if (overseerGroup) {
        if (overseerGroup.categoryId === null) {
          return { status: "GROUP_NOT_SET_UP" };
        }
        ({ categoryId } = overseerGroup);
        nickname = `[${overseerGroup.index}] ${firstNameOf(userName)}`;
      } else {
        nickname = `[Staff] ${firstNameOf(userName)}`;
      }

      await repository.upsertLink(userId, discordUserId);

      const applied = await gateway.applyStaffVerification({
        categoryId,
        discordUserId,
        isAdmin,
        nickname,
      });

      return applied.ok ? { status: "SUCCESS" } : { status: "BOT_APPLY_FAILED" };
    },
  };
}
