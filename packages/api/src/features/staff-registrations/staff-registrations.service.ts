import { createError } from "evlog";

import type { StaffRegistrationRepository } from "./staff-registrations.repository";
import type { StaffRegistration } from "./staff-registrations.schema";

export interface StaffRegistrationService {
  get: (id: string) => Promise<StaffRegistration>;
  list: () => Promise<StaffRegistration[]>;
}

function staffNotFoundError() {
  return createError({
    code: "STAFF_REGISTRATION_NOT_FOUND",
    fix: "Check the staff member and try again",
    message: "Staff member not found",
    status: 404,
    why: "No staff account matches the requested ID",
  });
}

export function createStaffRegistrationService(
  repository: StaffRegistrationRepository,
): StaffRegistrationService {
  return {
    get: async (id) => {
      const staff = await repository.findById(id);
      if (!staff || staff.role !== "staff") {
        throw staffNotFoundError();
      }
      return staff;
    },
    list: async () => await repository.list(),
  };
}
