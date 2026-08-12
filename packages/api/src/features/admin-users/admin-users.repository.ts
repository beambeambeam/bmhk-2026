import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { isAuthRole } from "@bmhk-2026/auth/permission";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
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
const LIKE_PATTERN_CHARACTER = /[\\%_]/gu;
const normalizedUserRole = sql<string>`coalesce(${user.role}, 'user')`;

function escapeLikePattern(value: string): string {
  return value.replace(LIKE_PATTERN_CHARACTER, "\\$&");
}

function createFilterConditions(columnFilters: readonly AdminUserColumnFilter[]): SQL[] {
  const conditions: SQL[] = [];

  for (const filter of columnFilters) {
    if (filter.value.length === 0) {
      continue;
    }

    switch (filter.id) {
      case "email": {
        conditions.push(ilike(user.email, `%${escapeLikePattern(filter.value)}%`));
        break;
      }
      case "name": {
        conditions.push(ilike(user.name, `%${escapeLikePattern(filter.value)}%`));
        break;
      }
      case "role": {
        conditions.push(eq(normalizedUserRole, filter.value));
        break;
      }
      default: {
        break;
      }
    }
  }

  return conditions;
}

function createOrderBy(sorting: readonly AdminUserSort[]) {
  const sortColumns = {
    email: user.email,
    name: user.name,
    role: normalizedUserRole,
  } as const;
  const requestedSorting = sorting.length > 0 ? sorting : [{ desc: false, id: "email" } as const];
  const orderBy = requestedSorting.map((sort) => {
    const column = sortColumns[sort.id];
    return sort.desc ? desc(column) : asc(column);
  });

  return [...orderBy, asc(user.id)];
}

export function createAdminUserRepository(database: Database = db): AdminUserRepository {
  const execute = createRepositoryExecutor(adminUserRepositoryError);

  return {
    list: async ({ columnFilters, pagination, sorting }) =>
      await execute(
        async () =>
          await database.transaction(
            async (transaction) => {
              const where = and(...createFilterConditions(columnFilters));
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
                .orderBy(...createOrderBy(sorting))
                .limit(pagination.pageSize)
                .offset(pagination.pageIndex * pagination.pageSize);

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
