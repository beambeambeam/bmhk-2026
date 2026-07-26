import type { z } from "zod";

import type {
  createTeamSchema,
  teamListPaginationSchema,
  teamListResultSchema,
  teamSchema,
  updateTeamDataSchema,
} from "./teams.schemas";

export type Team = z.output<typeof teamSchema>;
export type TeamAward = Team["award"];

export type CreateTeamData = z.output<typeof createTeamSchema>;
export type UpdateTeamData = z.output<typeof updateTeamDataSchema>;

export type TeamListPagination = z.output<typeof teamListPaginationSchema>;
export type TeamListResult = z.output<typeof teamListResultSchema>;
