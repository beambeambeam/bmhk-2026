import {
  createAppRouter,
  createDiscordAdminRepository,
  createDiscordAdminService,
  createDiscordRepository,
  createDiscordService,
  createDiscordTeamGroupsRepository,
  createDiscordTeamGroupsService,
  createFetchDiscordBotGateway,
  createStaffDiscordLinkRepository,
  createStaffDiscordLinkService,
} from "@bmhk-2026/api";
import type { DiscordBotGateway } from "@bmhk-2026/api";
import { auth } from "@bmhk-2026/auth";
import { env } from "@bmhk-2026/env/server";
import { log } from "evlog";

import { createApp } from "./app";
import {
  createAuditEventWriter,
  createAuditObservabilityOptions,
} from "./infrastructure/audit-events";
import {
  composeDrains,
  createTelemetryDrain,
  initializeObservability,
} from "./infrastructure/observability";
import { createAuthReader } from "./modules/auth/auth-reader";

initializeObservability();

const authReader = createAuthReader(auth);
const { DISCORD_BOT_BASE_URL: discordBotBaseUrl, DISCORD_BOT_INTERNAL_SECRET: discordBotSecret } =
  env;
const discordEnabled = discordBotBaseUrl !== undefined && discordBotSecret !== undefined;
// Without the bot, staff Discord linking reports BOT_APPLY_FAILED instead of calling out.
const discordBotGateway: DiscordBotGateway = discordEnabled
  ? createFetchDiscordBotGateway({ baseUrl: discordBotBaseUrl, secret: discordBotSecret })
  : { applyStaffVerification: async () => await Promise.resolve({ ok: false }) };
const staffDiscordLinkService = createStaffDiscordLinkService(
  createStaffDiscordLinkRepository(),
  discordBotGateway,
);
const apiRouter = createAppRouter({
  auth: authReader,
  staffDiscordLinkService,
});
const discordAdminService = createDiscordAdminService(createDiscordAdminRepository());
const discordService = createDiscordService(createDiscordRepository());
const teamGroupsService = createDiscordTeamGroupsService(createDiscordTeamGroupsRepository());
const auditObservability = createAuditObservabilityOptions({
  hmacKeyId: env.AUDIT_HMAC_KEY_ID,
  hmacSecret: env.AUDIT_HMAC_SECRET,
  writer: createAuditEventWriter(),
});
const app = createApp({
  apiRouter,
  auth,
  corsOrigins: env.CORS_ORIGIN,
  discordAdminService,
  discordEnabled,
  discordService,
  observability: {
    ...auditObservability,
    drain: composeDrains(auditObservability.drain, createTelemetryDrain()),
  },
  staffDiscordLinkService,
  teamGroupsService,
  verifyApiKey: authReader.verifyApiKey,
});

app.listen(env.PORT, ({ hostname, port }) => {
  log.info({
    discordEnabled,
    event: "server.started",
    hostname,
    port,
  });
});
