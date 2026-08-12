import { db } from "@bmhk-2026/db";
import { user } from "@bmhk-2026/db/schema/auth";
import { eq } from "drizzle-orm";

import { createRepositoryExecutor } from "../../core/repository";
import { adminUserRepositoryError, createAdminUserRepositoryError } from "./admin-users.errors";
import type { AdminUserRole } from "./admin-users.schema";

export interface AdminUserRoleChange {
  previousRole: string | null;
  role: AdminUserRole;
  userId: string;
}

export interface AdminUserRepository {
  setRole: (userId: string, role: AdminUserRole) => Promise<AdminUserRoleChange | null>;
}

type Database = typeof db;

export function createAdminUserRepository(database: Database = db): AdminUserRepository {
  const execute = createRepositoryExecutor(adminUserRepositoryError);

  return {
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
