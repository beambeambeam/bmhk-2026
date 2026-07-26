import type { RouterClient } from "@orpc/server";

import type { AuthReader } from "./core/auth";
import { createProcedures } from "./core/procedure";
import { createHealthRouter } from "./features/health/health.router";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";
import type { TeamRepository } from "./features/teams/teams.repository";
import { createTeamsRouter } from "./features/teams/teams.router";

export interface ApiDependencies {
  auth: AuthReader;
  teams: TeamRepository;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const { protectedProcedure, publicProcedure } = createProcedures(dependencies);

  return {
    health: createHealthRouter(publicProcedure),
    privateData: createPrivateDataRouter(protectedProcedure),
    teams: createTeamsRouter(protectedProcedure, dependencies.teams),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
