import type { AuthReader, DiscordService, DiscordTeamGroupsService } from "@bmhk-2026/api";
import {
  discordQueryInputSchema,
  discordTeamGroupCategoryInputSchema,
  discordTeamGroupMemberChannelInputSchema,
  discordVerifyInputSchema,
} from "@bmhk-2026/api";
import { Elysia } from "elysia";

async function isValidApiKey(
  headers: Record<string, string | undefined>,
  verifyApiKey: AuthReader["verifyApiKey"],
): Promise<boolean> {
  const key = headers["x-api-key"];
  if (key === undefined || key === "") {
    return false;
  }

  const verification = await verifyApiKey({ key });
  return verification.valid;
}

export function createDiscordModule(
  service: DiscordService,
  teamGroupsService: DiscordTeamGroupsService,
  verifyApiKey: AuthReader["verifyApiKey"],
) {
  return new Elysia({ name: "discord" }).group("/api/discord", (app) =>
    app
      .get("/query", async ({ query, status }) => {
        const input = discordQueryInputSchema.safeParse({ code: query.code });
        if (!input.success) {
          return status(400);
        }

        return await service.query(input.data.code);
      })
      .post("/verify", async ({ body, status }) => {
        const input = discordVerifyInputSchema.safeParse(body);
        if (!input.success) {
          return status(400);
        }

        return await service.verify(input.data.code, input.data.id);
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
      }),
  );
}
