import type { RouterClient } from "@orpc/server";

import type { AuthReader } from "./core/auth";
import { createProcedures } from "./core/procedure";
import { createHealthRouter } from "./features/health/health.router";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";

export interface ApiDependencies {
  auth: AuthReader;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const { protectedProcedure, publicProcedure } = createProcedures(dependencies);

  return {
    health: createHealthRouter(publicProcedure),
    privateData: createPrivateDataRouter(protectedProcedure),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
