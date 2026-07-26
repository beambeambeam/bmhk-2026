import { createAppRouter } from "@bmhk-2026/api";
import { auth } from "@bmhk-2026/auth";
import { env } from "@bmhk-2026/env/server";
import { log } from "evlog";

import { createApp } from "./app";
import { initializeObservability } from "./infrastructure/observability";
import { createAuthReader } from "./modules/auth/auth-reader";
import { createTeamRepository } from "./modules/teams/team.repository";

initializeObservability();

const apiRouter = createAppRouter({
  auth: createAuthReader(auth),
  teams: createTeamRepository(),
});
const app = createApp({
  apiRouter,
  auth,
  corsOrigins: env.CORS_ORIGIN,
});

app.listen(env.PORT, ({ hostname, port }) => {
  log.info({
    event: "server.started",
    hostname,
    port,
  });
});
