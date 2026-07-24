import type { AppRouter } from "@bmhk-2026/api";
import type { auth } from "@bmhk-2026/auth";
import type { EvlogElysiaOptions } from "evlog/elysia";
import { Elysia } from "elysia";
import type { AnyElysia } from "elysia";

import { createApiModule } from "./modules/api/api.module";
import { createAuthModule } from "./modules/auth/auth.module";
import { createCorsPlugin } from "./infrastructure/cors";
import { createObservabilityPlugin } from "./infrastructure/observability";

export interface CreateAppOptions {
  apiRouter: AppRouter;
  auth: typeof auth;
  corsOrigins: string[];
  observability?: EvlogElysiaOptions;
}

export function createApp({
  apiRouter,
  auth,
  corsOrigins,
  observability,
}: CreateAppOptions): AnyElysia {
  return new Elysia({ name: "bmhk-2026-server" })
    .use(createObservabilityPlugin(observability))
    .use(createCorsPlugin(corsOrigins))
    .use(createAuthModule(auth))
    .use(createApiModule(apiRouter))
    .get("/", () => "OK");
}
