import type { StaffProcedure } from "../../core/procedure";
import { staffCheckInCancelledAudit, staffCheckInCreatedAudit } from "../audit/audit.actions";
import { executeAudited } from "../audit/audit.service";
import {
  createStaffCheckInSchema,
  listStaffCheckInsSchema,
  staffCheckInListResultSchema,
} from "./staff-check-ins.schema";
import type { StaffCheckInService } from "./staff-check-ins.service";

export function createStaffCheckInsRouter(
  staffProcedure: StaffProcedure,
  service: StaffCheckInService,
) {
  return {
    cancel: staffProcedure
      .route({ method: "DELETE", tags: ["Staff Check-in"] })
      .input(createStaffCheckInSchema)
      .output(createStaffCheckInSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: staffCheckInCancelledAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.staffUserId },
          }),
          deniedErrorCodes: ["STAFF_CHECK_IN_NOT_FOUND"],
          execute: async () => {
            await service.cancel(input.staffUserId);
          },
          log: context.log,
        });

        return input;
      }),
    checkIn: staffProcedure
      .route({ method: "POST", tags: ["Staff Check-in"] })
      .input(createStaffCheckInSchema)
      .output(createStaffCheckInSchema)
      .handler(async ({ context, input }) => {
        await executeAudited({
          audit: staffCheckInCreatedAudit({
            actor: { id: context.session.user.id, type: "user" },
            target: { id: input.staffUserId },
          }),
          deniedErrorCodes: ["STAFF_CHECK_IN_TARGET_NOT_FOUND"],
          execute: async () => {
            await service.checkIn(input.staffUserId, context.session.user.id);
          },
          log: context.log,
          onSuccess: () => ({ changes: { after: { status: "checked-in" } } }),
        });

        return input;
      }),
    list: staffProcedure
      .route({ method: "GET", tags: ["Staff Check-in"] })
      .input(listStaffCheckInsSchema)
      .output(staffCheckInListResultSchema)
      .handler(async ({ input }) => await service.list(input)),
  };
}
