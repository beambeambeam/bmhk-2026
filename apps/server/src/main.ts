import { createAppRouter, createDiscordRepository, createDiscordService } from "@bmhk-2026/api";
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
  createBetterStackDrain,
  initializeObservability,
} from "./infrastructure/observability";
import { createAuthReader } from "./modules/auth/auth-reader";

initializeObservability();

const authReader = createAuthReader(auth);
const apiRouter = createAppRouter({
  auth: authReader,
});
const discordService = createDiscordService(createDiscordRepository());
const auditObservability = createAuditObservabilityOptions({
  hmacKeyId: env.AUDIT_HMAC_KEY_ID,
  hmacSecret: env.AUDIT_HMAC_SECRET,
  writer: createAuditEventWriter(),
});
const app = createApp({
  apiRouter,
  auth,
  corsOrigins: env.CORS_ORIGIN,
  discordService,
  observability: {
    ...auditObservability,
    drain: composeDrains(auditObservability.drain, createBetterStackDrain()),
  },
});

app.listen(env.PORT, ({ hostname, port }) => {
  log.info({
    event: "server.started",
    hostname,
    port,
  });
});
