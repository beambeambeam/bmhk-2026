import { createAppRouter } from "@bmhk-2026/api";
import { auth } from "@bmhk-2026/auth";
import { env } from "@bmhk-2026/env/server";

import { createApp } from "./app";
import { initializeObservability } from "./infrastructure/observability";
import { createAuthReader } from "./modules/auth/auth-reader";

initializeObservability();

const apiRouter = createAppRouter({
  auth: createAuthReader(auth),
});
const app = createApp({
  apiRouter,
  auth,
  corsOrigins: env.CORS_ORIGIN,
});

app.listen(env.PORT, ({ hostname, port }) => {
  console.info(`Server is running on http://${hostname}:${port}`);
});
