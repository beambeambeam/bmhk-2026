import { db } from "@bmhk-2026/db";
import { staffCheckIns } from "@bmhk-2026/db/schema/staff-check-ins";
import { user } from "@bmhk-2026/db/schema/auth";
import { and, count, eq, ilike } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import { createTableOrderBy, createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { createRepositoryExecutor } from "../../core/repository";
import { getTableOffset } from "../../core/table-query";
import { staffCheckInRepositoryError } from "./staff-check-ins.errors";
import type {
  StaffCheckInColumnFilter,
  StaffCheckInListQuery,
  StaffCheckInListResult,
  StaffCheckInSort,
} from "./staff-check-ins.schema";

export interface StaffCheckInRepository {
  cancel: (userId: string) => Promise<boolean>;
  checkIn: (userId: string, checkedInByUserId: string) => Promise<boolean | null>;
  list: (query: StaffCheckInListQuery) => Promise<StaffCheckInListResult>;
}

type Database = typeof db;
const checkedInByUser = alias(user, "checked_in_by_user");
const staffRoleCondition = eq(user.role, "staff");
const staffCheckInSortColumns = {
  checkedInAt: staffCheckIns.checkedInAt,
  email: user.email,
  name: user.name,
} as const;
const defaultStaffCheckInSorting = [
  { desc: false, id: "name" },
] as const satisfies readonly StaffCheckInSort[];

function createStaffCheckInFilterCondition(filter: StaffCheckInColumnFilter): SQL | undefined {
  if (filter.value.length === 0) {
    return undefined;
  }

  if (filter.id === "email") {
    return ilike(user.email, `%${escapeLikePattern(filter.value)}%`);
  }

  return ilike(user.name, `%${escapeLikePattern(filter.value)}%`);
}

export function createStaffCheckInRepository(database: Database = db): StaffCheckInRepository {
  const execute = createRepositoryExecutor(staffCheckInRepositoryError);

  return {
    cancel: async (userId) =>
      await execute(async () => {
        const cancelled = await database
          .delete(staffCheckIns)
          .where(eq(staffCheckIns.userId, userId))
          .returning({ userId: staffCheckIns.userId });

        return cancelled.length > 0;
      }),
    checkIn: async (userId, checkedInByUserId) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [staffUser] = await transaction
              .select({ id: user.id, role: user.role })
              .from(user)
              .where(and(eq(user.id, userId), staffRoleCondition))
              .for("update")
              .limit(1);

            if (!staffUser || staffUser.role !== "staff") {
              return null;
            }

            const created = await transaction
              .insert(staffCheckIns)
              .values({ checkedInByUserId, userId })
              .onConflictDoNothing()
              .returning({ userId: staffCheckIns.userId });

            return created.length > 0;
          }),
      ),
    list: async ({ columnFilters, pagination, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const filters = createTableWhere(columnFilters, createStaffCheckInFilterCondition);
              const where = filters ? and(staffRoleCondition, filters) : staffRoleCondition;
              const [totalResult] = await transaction
                .select({ value: count() })
                .from(user)
                .where(where);
              const records = await transaction
                .select({
                  checkedInAt: staffCheckIns.checkedInAt,
                  checkedInByName: checkedInByUser.name,
                  email: user.email,
                  id: user.id,
                  name: user.name,
                })
                .from(user)
                .leftJoin(staffCheckIns, eq(staffCheckIns.userId, user.id))
                .leftJoin(checkedInByUser, eq(checkedInByUser.id, staffCheckIns.checkedInByUserId))
                .where(where)
                .orderBy(
                  ...createTableOrderBy({
                    columns: staffCheckInSortColumns,
                    fallbackSorting: defaultStaffCheckInSorting,
                    sorting,
                    stableColumn: user.id,
                  }),
                )
                .limit(pagination.pageSize)
                .offset(getTableOffset(pagination));

              return {
                rowCount: totalResult?.value ?? 0,
                rows: records.map((record) => ({
                  checkIn:
                    record.checkedInAt !== null && record.checkedInByName !== null
                      ? {
                          checkedInAt: record.checkedInAt,
                          checkedInByName: record.checkedInByName,
                        }
                      : null,
                  email: record.email,
                  id: record.id,
                  name: record.name,
                })),
              };
            },
            { accessMode: "read only", isolationLevel: "repeatable read" },
          ),
      ),
  };
}
