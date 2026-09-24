import {
  createParticipantAlreadyCheckedInError,
  createParticipantCheckInNotFoundError,
  createParticipantCheckInTargetNotFoundError,
  createParticipantNotRoundEligibleError,
} from "./participant-check-ins.errors";
import type { ParticipantCheckInRepository } from "./participant-check-ins.repository";
import type {
  CheckInRound,
  ParticipantCheckInFlag,
  ParticipantCheckInListQuery,
  ParticipantCheckInListResult,
} from "./participant-check-ins.schema";

export interface ParticipantCheckInService {
  cancel: (participantId: string, round: CheckInRound) => Promise<void>;
  checkIn: (participantId: string, checkedInByUserId: string, round: CheckInRound) => Promise<void>;
  registerTeam: (teamId: string, userId: string, round: CheckInRound) => Promise<void>;
  cancelTeam: (teamId: string, round: CheckInRound) => Promise<void>;
  list: (query: ParticipantCheckInListQuery) => Promise<ParticipantCheckInListResult>;
  updateFlag: (
    participantId: string,
    flag: ParticipantCheckInFlag | null,
    round: CheckInRound,
  ) => Promise<void>;
}
export function createParticipantCheckInService(
  repository: ParticipantCheckInRepository,
): ParticipantCheckInService {
  return {
    cancel: async (participantId, round) => {
      if (!(await repository.cancel(participantId, round))) {
        throw createParticipantCheckInNotFoundError();
      }
    },
    cancelTeam: async (teamId, round) => {
      if (!(await repository.cancelTeam(teamId, round))) {
        throw createParticipantCheckInNotFoundError();
      }
    },
    checkIn: async (participantId, checkedInByUserId, round) => {
      const attempt = await repository.checkIn(participantId, checkedInByUserId, round);
      if (attempt === "TARGET_NOT_FOUND") {
        throw createParticipantCheckInTargetNotFoundError();
      }
      if (attempt === "NOT_ELIGIBLE") {
        throw createParticipantNotRoundEligibleError();
      }
      if (attempt === "ALREADY_CHECKED_IN") {
        throw createParticipantAlreadyCheckedInError();
      }
    },
    list: async (query) => await repository.list(query),
    registerTeam: async (teamId, userId, round) => {
      const result = await repository.registerTeam(teamId, userId, round);
      if (result === "TARGET_NOT_FOUND") {
        throw createParticipantCheckInTargetNotFoundError();
      }
      if (result === "NOT_ELIGIBLE") {
        throw createParticipantNotRoundEligibleError();
      }
      if (result === "ALREADY_CHECKED_IN") {
        throw createParticipantAlreadyCheckedInError();
      }
    },
    updateFlag: async (participantId, flag, round) => {
      if (!(await repository.updateFlag(participantId, flag, round))) {
        throw createParticipantCheckInNotFoundError();
      }
    },
  };
}
