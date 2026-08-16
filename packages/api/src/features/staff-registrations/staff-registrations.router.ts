import type { RegistrationProcedure } from "../../core/procedure";
import type { StaffRegistrationService } from "./staff-registrations.service";
import {
  staffRegistrationIdInputSchema,
  staffRegistrationListSchema,
  staffRegistrationSchema,
} from "./staff-registrations.schema";

export function createStaffRegistrationsRouter(
  registrationProcedure: RegistrationProcedure,
  service: StaffRegistrationService,
) {
  return {
    get: registrationProcedure
      .route({ method: "GET", tags: ["Staff Registration"] })
      .input(staffRegistrationIdInputSchema)
      .output(staffRegistrationSchema)
      .handler(async ({ input }) => await service.get(input.id)),
    list: registrationProcedure
      .route({ method: "GET", tags: ["Staff Registration"] })
      .input(staffRegistrationIdInputSchema.partial().default({}))
      .output(staffRegistrationListSchema)
      .handler(async () => await service.list()),
  };
}
