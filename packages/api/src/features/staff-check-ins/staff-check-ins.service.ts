import {
  createStaffAlreadyCheckedInError,
  createStaffCheckInNotFoundError,
  createStaffCheckInTargetNotFoundError,
} from "./staff-check-ins.errors";
import type { StaffCheckInRepository } from "./staff-check-ins.repository";
import type { StaffCheckInListQuery, StaffCheckInListResult } from "./staff-check-ins.schema";

export interface StaffCheckInService {
  cancel: (userId: string) => Promise<void>;
  checkIn: (userId: string, checkedInByUserId: string) => Promise<void>;
  list: (query: StaffCheckInListQuery) => Promise<StaffCheckInListResult>;
}

export function createStaffCheckInService(repository: StaffCheckInRepository): StaffCheckInService {
  return {
    cancel: async (userId) => {
      const cancelled = await repository.cancel(userId);
      if (!cancelled) {
        throw createStaffCheckInNotFoundError();
      }
    },
    checkIn: async (userId, checkedInByUserId) => {
      const created = await repository.checkIn(userId, checkedInByUserId);
      if (created === null) {
        throw createStaffCheckInTargetNotFoundError();
      }
      if (!created) {
        throw createStaffAlreadyCheckedInError();
      }
    },
    list: async (query) => await repository.list(query),
  };
}
