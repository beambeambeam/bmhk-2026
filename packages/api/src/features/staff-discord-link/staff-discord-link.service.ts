import type { DiscordBotGateway } from "./discord-bot-gateway";
import { staffNicknameOf } from "./staff-nickname";
import type { StaffDiscordLinkRepository } from "./staff-discord-link.repository";
import type {
  StaffDiscordLinkPreviewResult,
  StaffDiscordLinkResult,
} from "./staff-discord-link.schema";

const INELIGIBLE_ROLE = "user";
const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export interface LinkStaffDiscordParams {
  token: string;
  userId: string;
  userName: string;
  userRole: string | null | undefined;
}

export interface StaffDiscordLinkService {
  createToken: (
    discordUserId: string,
    discordUsername: string,
    discordAvatarUrl: string | null,
  ) => Promise<{ expiresAt: Date; token: string }>;
  link: (params: LinkStaffDiscordParams) => Promise<StaffDiscordLinkResult>;
  preview: (token: string) => Promise<StaffDiscordLinkPreviewResult>;
}

export function createStaffDiscordLinkService(
  repository: StaffDiscordLinkRepository,
  gateway: DiscordBotGateway,
): StaffDiscordLinkService {
  return {
    createToken: async (discordUserId, discordUsername, discordAvatarUrl) =>
      await repository.createToken(discordUserId, discordUsername, discordAvatarUrl),
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

      const nicknameResult = staffNicknameOf({ overseerGroup, role, userName });
      if (nicknameResult.status === "GROUP_NOT_SET_UP") {
        return { status: "GROUP_NOT_SET_UP" };
      }
      const { nickname } = nicknameResult;
      const categoryId = overseerGroup ? overseerGroup.categoryId : null;

      await repository.upsertLink(userId, discordUserId);

      const applied = await gateway.applyStaffVerification({
        categoryId,
        discordUserId,
        isAdmin,
        nickname,
      });

      return applied.ok ? { status: "SUCCESS" } : { status: "BOT_APPLY_FAILED" };
    },
    preview: async (token) => {
      const preview = await repository.previewToken(token);
      return preview
        ? {
            discordAvatarUrl: preview.discordAvatarUrl,
            discordUsername: preview.discordUsername,
            status: "OK",
          }
        : { status: "INVALID_TOKEN" };
    },
  };
}
