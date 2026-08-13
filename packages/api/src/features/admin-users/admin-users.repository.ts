import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { isAuthRole } from "@bmhk-2026/auth/permission";
import { count, eq, ilike, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { createTableOrderBy, createTableWhere, escapeLikePattern } from "../../core/query-builder";
import { createRepositoryExecutor } from "../../core/repository";
import { getTableOffset } from "../../core/table-query";
import { adminUserRepositoryError, createAdminUserRepositoryError } from "./admin-users.errors";
import type {
  AdminUserColumnFilter,
  AdminUserListQuery,
  AdminUserListResult,
  AdminUserRole,
  AdminUserSort,
} from "./admin-users.schema";

export interface AdminUserRoleChange {
  previousRole: string | null;
  role: AdminUserRole;
  userId: string;
}

export interface AdminUserRepository {
  list: (query: AdminUserListQuery) => Promise<AdminUserListResult>;
  setRole: (userId: string, role: AdminUserRole) => Promise<AdminUserRoleChange | null>;
}

type Database = typeof db;
const normalizedUserRole = sql<string>`coalesce(${user.role}, 'user')`;
const adminUserSortColumns = {
  email: user.email,
  name: user.name,
  role: normalizedUserRole,
} as const;
const defaultAdminUserSorting = [
  { desc: false, id: "email" },
] as const satisfies readonly AdminUserSort[];

function createAdminUserFilterCondition(filter: AdminUserColumnFilter): SQL | undefined {
  if (filter.value.length === 0) {
    return undefined;
  }

  switch (filter.id) {
    case "email": {
      return ilike(user.email, `%${escapeLikePattern(filter.value)}%`);
    }
    case "emailDomain": {
      return ilike(user.email, `%@${escapeLikePattern(filter.value)}`);
    }
    case "name": {
      return ilike(user.name, `%${escapeLikePattern(filter.value)}%`);
    }
    case "role": {
      return eq(normalizedUserRole, filter.value);
    }
    default: {
      return undefined;
    }
  }
}

export function createAdminUserRepository(database: Database = db): AdminUserRepository {
  const execute = createRepositoryExecutor(adminUserRepositoryError);

  return {
    list: async ({ columnFilters, pagination, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const where = createTableWhere(columnFilters, createAdminUserFilterCondition);
              const [totalResult] = await transaction
                .select({ value: count() })
                .from(user)
                .where(where);
              const records = await transaction
                .select({
                  email: user.email,
                  id: user.id,
                  name: user.name,
                  role: normalizedUserRole,
                })
                .from(user)
                .where(where)
                .orderBy(
                  ...createTableOrderBy({
                    columns: adminUserSortColumns,
                    fallbackSorting: defaultAdminUserSorting,
                    sorting,
                    stableColumn: user.id,
                  }),
                )
                .limit(pagination.pageSize)
                .offset(getTableOffset(pagination));

              return {
                rowCount: totalResult?.value ?? 0,
                rows: records.map((record) => {
                  const role = record.role ?? "";

                  return {
                    ...record,
                    role: isAuthRole(role) ? role : "user",
                  };
                }),
              };
            },
            {
              accessMode: "read only",
              isolationLevel: "repeatable read",
            },
          ),
      ),
    setRole: async (userId, role) =>
      await execute(
        async () =>
          await database.transaction(async (transaction) => {
            const [currentUser] = await transaction
              .select({ role: user.role })
              .from(user)
              .where(eq(user.id, userId))
              .for("update")
              .limit(1);

            if (!currentUser) {
              return null;
            }

            const [updatedUser] = await transaction
              .update(user)
              .set({ role })
              .where(eq(user.id, userId))
              .returning({ id: user.id, role: user.role });

            if (!updatedUser) {
              throw createAdminUserRepositoryError();
            }

            return {
              previousRole: currentUser.role,
              role,
              userId: updatedUser.id,
            };
          }),
      ),
  };
}
