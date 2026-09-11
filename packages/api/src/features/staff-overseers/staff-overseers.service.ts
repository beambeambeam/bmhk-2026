import type {
  StaffOverseerBacklogRecord,
  StaffOverseersRepository,
} from "./staff-overseers.repository";
import type {
  StaffOverseerBacklogList,
  StaffOverseerBacklogRetryResult,
  StaffOverseerBacklogRetryResultList,
  StaffOverseerImportResult,
  StaffOverseerImportRow,
  StaffOverseerImportRowOutcome,
  StaffOverseerList,
} from "./staff-overseers.schema";

export interface StaffOverseersService {
  importRows: (rows: StaffOverseerImportRow[]) => Promise<StaffOverseerImportResult>;
  listBacklog: () => Promise<StaffOverseerBacklogList>;
  listOverseers: () => Promise<StaffOverseerList>;
  retryAllBacklog: () => Promise<StaffOverseerBacklogRetryResultList>;
  retryBacklogEntry: (id: string) => Promise<StaffOverseerBacklogRetryResult>;
}

function toBacklogListItem(entry: StaffOverseerBacklogRecord) {
  return {
    createdAt: entry.createdAt,
    email: entry.email,
    groupIndex: entry.groupIndex,
    groupName: entry.groupName,
    id: entry.id,
  };
}

export function createStaffOverseersService(
  repository: StaffOverseersRepository,
): StaffOverseersService {
  async function importRow(row: StaffOverseerImportRow): Promise<StaffOverseerImportRowOutcome> {
    const group = await repository.findGroupByIndex(row.teamsGroupIndex);
    if (!group) {
      return {
        email: row.email,
        error: `No team group with index ${row.teamsGroupIndex}`,
        outcome: "error",
        teamsGroupIndex: row.teamsGroupIndex,
      };
    }

    const matchedUser = await repository.findUserByEmail(row.email);
    if (!matchedUser) {
      await repository.addBacklogEntry(row.email, group.id);
      return { email: row.email, outcome: "backlogged", teamsGroupIndex: row.teamsGroupIndex };
    }

    await repository.assignOverseer(group.id, matchedUser.id);
    return { email: row.email, outcome: "assigned", teamsGroupIndex: row.teamsGroupIndex };
  }

  async function retryEntry(id: string): Promise<StaffOverseerBacklogRetryResult> {
    const entry = await repository.findBacklogEntry(id);
    if (!entry) {
      return { outcome: "still_backlogged" };
    }

    const matchedUser = await repository.findUserByEmail(entry.email);
    if (!matchedUser) {
      return { outcome: "still_backlogged" };
    }

    await repository.assignOverseer(entry.groupId, matchedUser.id);
    await repository.removeBacklogEntry(entry.id);
    return { outcome: "assigned" };
  }

  return {
    importRows: async (rows) => {
      const results: StaffOverseerImportRowOutcome[] = [];
      for (const row of rows) {
        // eslint-disable-next-line no-await-in-loop -- rows apply one at a time so overwrite semantics stay deterministic
        results.push(await importRow(row));
      }
      return results;
    },
    listBacklog: async () => (await repository.listBacklog()).map(toBacklogListItem),
    listOverseers: async () => await repository.listOverseers(),
    retryAllBacklog: async () => {
      const entries = await repository.listBacklog();
      const results: StaffOverseerBacklogRetryResult[] = [];
      for (const entry of entries) {
        // eslint-disable-next-line no-await-in-loop -- sequential retries keep overwrite semantics deterministic
        results.push(await retryEntry(entry.id));
      }
      return results;
    },
    retryBacklogEntry: async (id) => await retryEntry(id),
  };
}
