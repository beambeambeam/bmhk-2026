export interface ApplyStaffVerificationParams {
  categoryId: string | null;
  discordUserId: string;
  isAdmin: boolean;
  nickname: string;
}

export interface DiscordBotGateway {
  applyStaffVerification: (params: ApplyStaffVerificationParams) => Promise<{ ok: boolean }>;
}

export interface DiscordBotGatewayConfig {
  baseUrl: string;
  secret: string;
}

export function createFetchDiscordBotGateway(config: DiscordBotGatewayConfig): DiscordBotGateway {
  return {
    applyStaffVerification: async ({ categoryId, discordUserId, isAdmin, nickname }) => {
      const response = await fetch(new URL("/internal/staff-verify", config.baseUrl), {
        body: JSON.stringify({
          category_id: categoryId,
          discord_user_id: discordUserId,
          is_admin: isAdmin,
          nickname,
        }),
        headers: { "content-type": "application/json", "x-internal-secret": config.secret },
        method: "POST",
      });

      return { ok: response.ok };
    },
  };
}
