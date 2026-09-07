import {
  createStaffAlreadyCheckedInError,
  createStaffCheckInNotFoundError,
  createStaffCheckInTargetNotFoundError,
} from "./staff-check-ins.errors";
import type { StaffCheckInRepository } from "./staff-check-ins.repository";
import type {
  CheckInRound,
  StaffCheckInListQuery,
  StaffCheckInListResult,
} from "./staff-check-ins.schema";

export interface StaffCheckInService {
  cancel: (userId: string, round: CheckInRound) => Promise<void>;
  checkIn: (userId: string, checkedInByUserId: string, round: CheckInRound) => Promise<void>;
  list: (query: StaffCheckInListQuery) => Promise<StaffCheckInListResult>;
}

export function createStaffCheckInService(repository: StaffCheckInRepository): StaffCheckInService {
  return {
    cancel: async (userId, round) => {
      const cancelled = await repository.cancel(userId, round);
      if (!cancelled) {
        throw createStaffCheckInNotFoundError();
      }
    },
    checkIn: async (userId, checkedInByUserId, round) => {
      const created = await repository.checkIn(userId, checkedInByUserId, round);
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
