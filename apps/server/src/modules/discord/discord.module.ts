import type { DiscordService } from "@bmhk-2026/api";
import { discordQueryInputSchema, discordVerifyInputSchema } from "@bmhk-2026/api";
import { Elysia } from "elysia";

export function createDiscordModule(service: DiscordService) {
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
      }),
  );
}
