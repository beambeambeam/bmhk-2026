import { authRoleValues, getManageableRoles } from "@bmhk-2026/auth/permission";

import {
  createAdminUserNotFoundError,
  createAdminUserRoleForbiddenError,
} from "./admin-users.errors";
import type { AdminUserRepository } from "./admin-users.repository";
import type {
  AdminUserListQuery,
  AdminUserListResult,
  AdminUserFilterOptions,
  AdminUserRole,
  AdminUserRoleResult,
} from "./admin-users.schema";

export interface AdminUserService {
  filter: () => AdminUserFilterOptions;
  list: (query: AdminUserListQuery) => Promise<AdminUserListResult>;
  setRole: (
    userId: string,
    role: AdminUserRole,
    actor: { id: string; role?: string | null },
  ) => Promise<{
    previousRole: string | null;
    user: AdminUserRoleResult;
  }>;
}

export function createAdminUserService(repository: AdminUserRepository): AdminUserService {
  return {
    filter: () => ({ roles: [...authRoleValues] }),
    list: async (query) => await repository.list(query),
    setRole: async (userId, role, actor) => {
      const manageableRoles = getManageableRoles(actor.role);
      if (actor.id === userId || !manageableRoles.includes(role)) {
        throw createAdminUserRoleForbiddenError();
      }
      const change = await repository.setRole(userId, role, manageableRoles);
      if (change === "forbidden") {
        throw createAdminUserRoleForbiddenError();
      }
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
