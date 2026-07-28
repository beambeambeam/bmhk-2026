import type { CreateTeamData, Team } from "../../../index";
import type { db as database } from "@bmhk-2026/db";
import { describe, expect, it, vi } from "vitest";

import { createTeamRepository } from "../teams.repository";

vi.mock(import("@bmhk-2026/db"), () => ({
  // Test mock only needs satisfy import-time default dependency.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  db: {} as typeof database,
}));

const USER_ID = "user-1";
const TEAM_ID = "11111111-1111-4111-8111-111111111111";

const testTeam = {
  award: "NO_ACHIEVEMENT",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  id: TEAM_ID,
  index: 1,
  memberCount: 0,
  name: "Team One",
  school: "Test School",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: USER_ID,
} satisfies Team;

const createTeamData = {
  award: "NO_ACHIEVEMENT",
  memberCount: 0,
  name: "Team One",
  school: "Test School",
} satisfies CreateTeamData;

type Database = Parameters<typeof createTeamRepository>[0];

function createSelectDatabase(rows: Team[]) {
  const limit = vi.fn<() => Promise<Team[]>>(async () => await Promise.resolve(rows));
  const where = vi.fn<() => { limit: typeof limit }>(() => ({ limit }));
  const from = vi.fn<() => { where: typeof where }>(() => ({ where }));
  const select = vi.fn<() => { from: typeof from }>(() => ({ from }));
  // Test double implements only select methods exercised by repository tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const database = { select } as unknown as NonNullable<Database>;

  return { database, select };
}

function createInsertDatabase(returning: () => Promise<unknown>) {
  const returningMock = vi.fn<() => Promise<unknown>>(returning);
  const values = vi.fn<() => { returning: typeof returningMock }>(() => ({
    returning: returningMock,
  }));
  const insert = vi.fn<() => { values: typeof values }>(() => ({ values }));
  // Test double implements only insert methods exercised by repository tests.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const database = { insert } as unknown as NonNullable<Database>;

  return { database };
}

describe("team repository", () => {
  it("finds a team by owner", async () => {
    const { database } = createSelectDatabase([testTeam]);
    const repository = createTeamRepository(database);

    await expect(repository.findByUserId(USER_ID)).resolves.toStrictEqual(testTeam);
  });

  it("returns null when owner has no team", async () => {
    const { database } = createSelectDatabase([]);
    const repository = createTeamRepository(database);

    await expect(repository.findByUserId(USER_ID)).resolves.toBeNull();
  });

  it("maps user uniqueness violations to a team conflict", async () => {
    const databaseError = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "teams_user_id_unique",
    });
    const { database } = createInsertDatabase(async () => await Promise.reject(databaseError));
    const repository = createTeamRepository(database);

    await expect(repository.create(USER_ID, createTeamData)).rejects.toMatchObject({
      code: "TEAM_ALREADY_EXISTS",
      status: 409,
    });
  });

  it("rethrows unrelated insert errors", async () => {
    const databaseError = new Error("database offline");
    const { database } = createInsertDatabase(async () => await Promise.reject(databaseError));
    const repository = createTeamRepository(database);

    await expect(repository.create(USER_ID, createTeamData)).rejects.toBe(databaseError);
  });
});
