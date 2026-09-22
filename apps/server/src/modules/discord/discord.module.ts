import type {
  AuthReader,
  DiscordAdminService,
  DiscordService,
  DiscordTeamGroupsService,
  StaffDiscordLinkService,
} from "@bmhk-2026/api";
import {
  discordAdminCodeInputSchema,
  discordAdminTeamQuerySchema,
  discordAdminUserInputSchema,
  discordVerificationQueriedAudit,
  discordVerificationRedeemedAudit,
  discordQueryInputSchema,
  discordTeamGroupCategoryInputSchema,
  discordTeamGroupMemberChannelInputSchema,
  discordVerifyInputSchema,
  staffVerifyTokenCreateInputSchema,
} from "@bmhk-2026/api";
import { Elysia } from "elysia";
import { useLogger } from "evlog/elysia";

async function getApiKeyId(
  headers: Record<string, string | undefined>,
  verifyApiKey: AuthReader["verifyApiKey"],
): Promise<string | null> {
  const key = headers["x-api-key"];
  if (key === undefined || key === "") {
    return null;
  }

  const verification = await verifyApiKey({ key });
  return verification.valid && verification.key !== null ? verification.key.id : null;
}

async function isValidApiKey(
  headers: Record<string, string | undefined>,
  verifyApiKey: AuthReader["verifyApiKey"],
): Promise<boolean> {
  return (await getApiKeyId(headers, verifyApiKey)) !== null;
}

export function createDiscordModule(
  service: DiscordService,
  teamGroupsService: DiscordTeamGroupsService,
  staffDiscordLinkService: StaffDiscordLinkService,
  adminService: DiscordAdminService,
  verifyApiKey: AuthReader["verifyApiKey"],
) {
  return new Elysia({ name: "discord" }).group("/api/discord", (app) =>
    app
      .get("/query", async ({ headers, query, status }) => {
        const actorId = await getApiKeyId(headers, verifyApiKey);
        if (actorId === null) {
          useLogger().audit.deny(
            "DISCORD_BOT_AUTH_REQUIRED",
            discordVerificationQueriedAudit({
              actor: { id: "unauthenticated", type: "api" },
              target: { id: "discord-verification" },
            }),
          );
          return status(401);
        }

        const input = discordQueryInputSchema.safeParse({ code: query.code });
        if (!input.success) {
          return status(400);
        }

        return await service.query(input.data.code, { actorId, log: useLogger() });
      })
      .post("/verify", async ({ body, headers, status }) => {
        const actorId = await getApiKeyId(headers, verifyApiKey);
        if (actorId === null) {
          useLogger().audit.deny(
            "DISCORD_BOT_AUTH_REQUIRED",
            discordVerificationRedeemedAudit({
              actor: { id: "unauthenticated", type: "api" },
              target: { id: "discord-verification" },
            }),
          );
          return status(401);
        }

        const input = discordVerifyInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        return await service.verify(input.data.code, input.data.id, { actorId, log: useLogger() });
      })
      .get("/team-groups", async ({ headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        return await teamGroupsService.list();
      })
      .patch("/team-groups/:id", async ({ body, headers, params, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordTeamGroupCategoryInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        const updated = await teamGroupsService.recordCategoryId(params.id, input.data.category_id);
        if (!updated) {
          return status(404);
        }

        return { ok: true };
      })
      .delete("/team-groups/:id/category", async ({ headers, params, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const updated = await teamGroupsService.clearCategoryId(params.id);
        if (!updated) {
          return status(404);
        }

        return { ok: true };
      })
      .patch("/team-group-members/:id", async ({ body, headers, params, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordTeamGroupMemberChannelInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        const updated = await teamGroupsService.recordChannelId(params.id, input.data.channel_id);
        if (!updated) {
          return status(404);
        }

        return { ok: true };
      })
      .delete("/team-group-members/:id/channel", async ({ headers, params, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const updated = await teamGroupsService.clearChannelId(params.id);
        if (!updated) {
          return status(404);
        }

        return { ok: true };
      })
      .post("/staff-verify/token", async ({ body, headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = staffVerifyTokenCreateInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        const { expiresAt, token } = await staffDiscordLinkService.createToken(
          input.data.discord_user_id,
          input.data.discord_username,
          input.data.discord_avatar_url,
        );
        return { expires_at: expiresAt.toISOString(), token };
      })
      .get("/admin/code-info", async ({ headers, query, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordAdminCodeInputSchema.safeParse({ code: query.code });
        if (!input.success) {
          return status(400);
        }

        return await adminService.codeInfo(input.data.code);
      })
      .get("/admin/teams", async ({ headers, query, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordAdminTeamQuerySchema.safeParse(query);
        if (!input.success) {
          return status(400);
        }

        return await adminService.teamInfo(input.data);
      })
      .get("/admin/absent-teams", async ({ headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        return await adminService.absentTeams();
      })
      .get("/admin/repair-facts", async ({ headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        return await adminService.repairFacts();
      })
      .post("/admin/unlink", async ({ body, headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordAdminUserInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        return await adminService.unlinkParticipant(input.data.discord_user_id);
      })
      .post("/admin/unlink-staff", async ({ body, headers, status }) => {
        if (!(await isValidApiKey(headers, verifyApiKey))) {
          return status(401);
        }

        const input = discordAdminUserInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        return await adminService.unlinkStaff(input.data.discord_user_id);
      }),
  );
}
