import type { AdminProcedure } from "../../core/procedure";
import { staffOverseerAssignedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  staffOverseerBacklogListSchema,
  staffOverseerBacklogRetryInputSchema,
  staffOverseerBacklogRetryResultListSchema,
  staffOverseerBacklogRetryResultSchema,
  staffOverseerImportInputSchema,
  staffOverseerImportResultSchema,
  staffOverseerListSchema,
} from "./staff-overseers.schema";
import type { StaffOverseersService } from "./staff-overseers.service";

export function createStaffOverseersRouter(
  adminProcedure: AdminProcedure,
  service: StaffOverseersService,
) {
  return {
    importRows: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .input(staffOverseerImportInputSchema)
      .output(staffOverseerImportResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "staff-overseer-import" },
            }),
            execute: async () => await service.importRows(input.rows),
            log: context.log,
            onSuccess: (result) => ({ changes: { after: { rows: result } } }),
          }),
      ),
    listBacklog: adminProcedure
      .route({ method: "GET", tags: ["Staff Overseers"] })
      .output(staffOverseerBacklogListSchema)
      .handler(async () => await service.listBacklog()),
    listOverseers: adminProcedure
      .route({ method: "GET", tags: ["Staff Overseers"] })
      .output(staffOverseerListSchema)
      .handler(async () => await service.listOverseers()),
    retryAllBacklog: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .output(staffOverseerBacklogRetryResultListSchema)
      .handler(
        async ({ context }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: "staff-overseer-backlog-retry-all" },
            }),
            execute: async () => await service.retryAllBacklog(),
            log: context.log,
          }),
      ),
    retryBacklogEntry: adminProcedure
      .route({ method: "POST", tags: ["Staff Overseers"] })
      .input(staffOverseerBacklogRetryInputSchema)
      .output(staffOverseerBacklogRetryResultSchema)
      .handler(
        async ({ context, input }) =>
          await executeAudited({
            audit: staffOverseerAssignedAudit({
              actor: { id: context.session.user.id, type: "user" },
              target: { id: input.id },
            }),
            execute: async () => await service.retryBacklogEntry(input.id),
            log: context.log,
          }),
      ),
  };
}
