import type { AdminProcedure } from "../../core/procedure";
import { userDirectoryAccessedAudit, userRoleChangedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  adminUserListResultSchema,
  adminUserFilterOptionsSchema,
  adminUserRoleResultSchema,
  listAdminUsersSchema,
  setAdminUserRoleSchema,
} from "./admin-users.schema";
import type { AdminUserService } from "./admin-users.service";

export function createAdminUsersRouter(adminProcedure: AdminProcedure, service: AdminUserService) {
  return {
    filter: adminProcedure
      .route({ method: "GET", tags: ["Admin User"] })
      .output(adminUserFilterOptionsSchema)
      .handler(() => service.filter()),
    list: adminProcedure
      .route({ method: "GET", tags: ["Admin User"] })
      .input(listAdminUsersSchema)
      .output(adminUserListResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: userDirectoryAccessedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "admin-users" },
            }),
            execute: async () => await service.list(input),
            log: context.log,
          }),
      ),
    setRole: adminProcedure
      .route({ method: "PATCH", tags: ["Admin User"] })
      .input(setAdminUserRoleSchema)
      .output(adminUserRoleResultSchema)
      .handler(async ({ context, input }) => {
        const result = await executeAudited({
          audit: userRoleChangedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.userId },
          }),
          deniedErrorCodes: ["ADMIN_USER_NOT_FOUND"],
          execute: async () => await service.setRole(input.userId, input.role),
          log: context.log,
          onSuccess: ({ previousRole }) => ({
            changes: {
              after: { role: input.role },
              before: { role: previousRole ?? "user" },
            },
          }),
        });

        context.log.set({ adminUser: { id: input.userId } });
        return result.user;
      }),
  };
}
