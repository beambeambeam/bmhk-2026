import { createAdminUserNotFoundError } from "./admin-users.errors";
import type { AdminUserRepository } from "./admin-users.repository";
import type { AdminUserRole, AdminUserRoleResult } from "./admin-users.schema";

export interface AdminUserService {
  setRole: (
    userId: string,
    role: AdminUserRole,
  ) => Promise<{
    previousRole: string | null;
    user: AdminUserRoleResult;
  }>;
}

export function createAdminUserService(repository: AdminUserRepository): AdminUserService {
  return {
    setRole: async (userId, role) => {
      const change = await repository.setRole(userId, role);
      if (!change) {
        throw createAdminUserNotFoundError();
      }

      return {
        previousRole: change.previousRole,
        user: { role: change.role, userId: change.userId },
      };
    },
  };
}
