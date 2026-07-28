import type { RouterClient } from "@orpc/server";

import type { AuthReader } from "./core";
import { createProcedures } from "./core";
import { createHealthRouter } from "./features/health/health.router";
import { createFileRepository } from "./features/files/files.repository";
import { createFilesRouter } from "./features/files/files.router";
import { createPrivateDataRouter } from "./features/private-data/private-data.router";
import type { FileRepository } from "./features/files/files.repository";
import type { TeamRepository } from "./features/teams/teams.repository";
import { createTeamRepository } from "./features/teams/teams.repository";
import { createTeamsRouter } from "./features/teams/teams.router";

export interface ApiDependencies {
  auth: AuthReader;
  /** Optional overrides keep feature tests isolated; production uses API-owned repositories. */
  files?: FileRepository;
  teams?: TeamRepository;
}

export function createAppRouter(dependencies: ApiDependencies) {
  const { protectedProcedure, publicProcedure } = createProcedures(dependencies);

  return {
    files: createFilesRouter(protectedProcedure, dependencies.files ?? createFileRepository()),
    health: createHealthRouter(publicProcedure),
    privateData: createPrivateDataRouter(protectedProcedure),
    teams: createTeamsRouter(protectedProcedure, dependencies.teams ?? createTeamRepository()),
  };
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export type ApiRouter = AppRouter;
export type AppRouterClient = RouterClient<AppRouter>;
