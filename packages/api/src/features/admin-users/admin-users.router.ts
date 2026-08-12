import type { AdminProcedure } from "../../core/procedure";
import { userRoleChangedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import { adminUserRoleResultSchema, setAdminUserRoleSchema } from "./admin-users.schema";
import type { AdminUserService } from "./admin-users.service";

export function createAdminUsersRouter(adminProcedure: AdminProcedure, service: AdminUserService) {
  return {
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
