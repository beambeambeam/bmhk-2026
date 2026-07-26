import type { CreateTeamData, Team, UpdateTeamData } from "./teams.types";

export interface TeamRepository {
  create: (userId: string, data: CreateTeamData) => Promise<Team>;
  delete: (userId: string, id: string) => Promise<boolean>;
  findById: (userId: string, id: string) => Promise<Team | null>;
  list: (
    userId: string,
    pagination: { limit: number; offset: number },
  ) => Promise<{ data: Team[]; total: number }>;
  update: (userId: string, id: string, data: UpdateTeamData) => Promise<Team | null>;
}
