import {
  createParticipantAlreadyCheckedInError,
  createParticipantCheckInNotFoundError,
  createParticipantCheckInTargetNotFoundError,
} from "./participant-check-ins.errors";
import type { ParticipantCheckInRepository } from "./participant-check-ins.repository";
import type {
  ParticipantCheckInFlag,
  ParticipantCheckInListQuery,
  ParticipantCheckInListResult,
} from "./participant-check-ins.schema";

export interface ParticipantCheckInService {
  cancel: (participantId: string) => Promise<void>;
  checkIn: (participantId: string, checkedInByUserId: string) => Promise<void>;
  list: (query: ParticipantCheckInListQuery) => Promise<ParticipantCheckInListResult>;
  updateFlag: (participantId: string, flag: ParticipantCheckInFlag | null) => Promise<void>;
}
export function createParticipantCheckInService(
  repository: ParticipantCheckInRepository,
): ParticipantCheckInService {
  return {
    cancel: async (participantId) => {
      if (!(await repository.cancel(participantId))) {
        throw createParticipantCheckInNotFoundError();
      }
    },
    checkIn: async (participantId, checkedInByUserId) => {
      const created = await repository.checkIn(participantId, checkedInByUserId);
      if (created === null) {
        throw createParticipantCheckInTargetNotFoundError();
      }
      if (!created) {
        throw createParticipantAlreadyCheckedInError();
      }
    },
    list: async (query) => await repository.list(query),
    updateFlag: async (participantId, flag) => {
      if (!(await repository.updateFlag(participantId, flag))) {
        throw createParticipantCheckInNotFoundError();
      }
    },
  };
}
