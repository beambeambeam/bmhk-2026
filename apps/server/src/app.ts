import type {
  AppRouter,
  AuthReader,
  DiscordAdminService,
  DiscordService,
  DiscordTeamGroupsService,
  StaffDiscordLinkService,
} from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import type { EvlogElysiaOptions } from "evlog/elysia";
import { Elysia } from "elysia";
import type { AnyElysia } from "elysia";

import { createApiModule } from "./modules/api/api.module";
import { createAuthModule } from "./modules/auth/auth.module";
import { createDiscordModule } from "./modules/discord/discord.module";
import { createCorsPlugin } from "./infrastructure/cors";
import { createObservabilityPlugin } from "./infrastructure/observability";

export interface CreateAppOptions {
  apiRouter: AppRouter;
  auth: typeof auth;
  corsOrigins: string[];
  discordAdminService: DiscordAdminService;
  discordEnabled: boolean;
  discordService: DiscordService;
  observability?: EvlogElysiaOptions;
  staffDiscordLinkService: StaffDiscordLinkService;
  teamGroupsService: DiscordTeamGroupsService;
  verifyApiKey: AuthReader["verifyApiKey"];
}

export function createApp({
  apiRouter,
  auth,
  corsOrigins,
  discordAdminService,
  discordEnabled,
  discordService,
  observability,
  staffDiscordLinkService,
  teamGroupsService,
  verifyApiKey,
}: CreateAppOptions): AnyElysia {
  const app = new Elysia({
    name: "bmhk-2026-server",
    serve: {
      maxRequestBodySize: 12 * 1024 * 1024,
    },
  })
    .use(createObservabilityPlugin(observability))
    .use(createCorsPlugin(corsOrigins))
    .use(createAuthModule(auth))
    .use(createApiModule(apiRouter));

  if (discordEnabled) {
    app.use(
      createDiscordModule(
        discordService,
        teamGroupsService,
        staffDiscordLinkService,
        discordAdminService,
        verifyApiKey,
      ),
    );
  }

  return app.get("/", () => "OK");
}
