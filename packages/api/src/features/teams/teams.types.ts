import type { teams } from "@bmhk-2026/db/schema/teams";

export type Team = typeof teams.$inferSelect;
type TeamInsertRow = typeof teams.$inferInsert;

export type CreateTeamData = Pick<TeamInsertRow, "award" | "memberCount" | "name" | "school">;
export type UpdateTeamData = Partial<CreateTeamData>;

export interface TeamListPagination {
  currentPage: number;
  limit: number;
  nextOffset: number | null;
  offset: number;
  previousOffset: number | null;
  total: number;
  totalPages: number;
}

export interface TeamListResult {
  data: Team[];
  pagination: TeamListPagination;
}
