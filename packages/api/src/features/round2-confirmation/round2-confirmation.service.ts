import type { TeamAccessContext } from "../../core/auth";
import type { FeatureFlagService } from "../feature-flags/feature-flags.service";
import type { FileRepository } from "../files/files.repository";
import type { FileServiceLog } from "../files/files.service";
import {
  cleanupReplacedFile,
  createFileNotFoundError,
  persistUploadedFile,
  storeUploadedFile,
  toPublicFileWithUrl,
} from "../files/files.service";
import type { FileStorage } from "../files/files.storage";
import { createTeamNotFoundError } from "../teams/teams.service";
import { createTeamParticipantNotFoundError } from "../team-participants/team-participants.service";
import { createRound2Conflict } from "./round2-confirmation.errors";
import type {
  Round2ConfirmationFacts,
  Round2ConfirmationRepository,
} from "./round2-confirmation.repository";
import type { Round2ConfirmationStatus, Round2DocumentInput } from "./round2-confirmation.schema";

function activeParticipants(
  facts: Round2ConfirmationFacts,
): Round2ConfirmationFacts["participants"] {
  return facts.participants.filter((participant) => participant.index <= facts.memberCount);
}

function isComplete(facts: Round2ConfirmationFacts): boolean {
  const participants = activeParticipants(facts);
  if (
    (facts.memberCount !== 2 && facts.memberCount !== 3) ||
    participants.length !== facts.memberCount
  ) {
    return false;
  }
  return participants.every(
    (participant, index) =>
      participant.index === index + 1 &&
      participant.identityDocumentFileId !== null &&
      participant.studentIdDocumentFileId !== null,
  );
}

export function createRound2ConfirmationService(
  repository: Round2ConfirmationRepository,
  storage: FileStorage,
  fileRepository: FileRepository,
  flags: FeatureFlagService,
  now: () => Date = () => new Date(),
) {
  function status(facts: Round2ConfirmationFacts): Round2ConfirmationStatus {
    return {
      confirmedAt: facts.confirmedAt,
      isComplete: isComplete(facts),
      isEligible: facts.award === "ADVANCED_TO_ROUND_2",
      isOpen: flags.getAll().round2Confirmation,
      memberCount: facts.memberCount,
      participants: activeParticipants(facts),
      state: facts.confirmedAt ? "CONFIRMED" : "DRAFT",
      teamId: facts.teamId,
    };
  }
  function assertWritable(facts: Round2ConfirmationFacts): void {
    if (facts.confirmedAt) {
      throw createRound2Conflict("ROUND2_CONFIRMATION_ALREADY_SUBMITTED");
    }
    if (facts.award !== "ADVANCED_TO_ROUND_2") {
      throw createRound2Conflict("ROUND2_CONFIRMATION_INELIGIBLE");
    }
    if (!flags.getAll().round2Confirmation) {
      throw createRound2Conflict("ROUND2_CONFIRMATION_CLOSED");
    }
  }
  async function find(
    access: TeamAccessContext,
    teamId?: string,
  ): Promise<Round2ConfirmationFacts> {
    const facts = await repository.findFacts(access, teamId);
    if (!facts) {
      throw createTeamNotFoundError();
    }
    return facts;
  }
  return {
    document: async (access: TeamAccessContext, input: Round2DocumentInput) => {
      const file = await repository.findDocument(access, input);
      if (!file) {
        throw createFileNotFoundError();
      }
      return await toPublicFileWithUrl(file, storage);
    },
    get: async (access: TeamAccessContext, teamId?: string) => status(await find(access, teamId)),
    submit: async (access: TeamAccessContext, teamId: string) => {
      function validate(facts: Round2ConfirmationFacts): void {
        assertWritable(facts);
        if (!isComplete(facts)) {
          throw createRound2Conflict("ROUND2_CONFIRMATION_INCOMPLETE");
        }
      }
      validate(await find(access, teamId));
      return status(await repository.submit(access, teamId, validate, now()));
    },
    uploadDocument: async (
      access: TeamAccessContext,
      input: Round2DocumentInput & { file: File },
      log: FileServiceLog,
    ) => {
      function validate(facts: Round2ConfirmationFacts): void {
        assertWritable(facts);
        if (
          !activeParticipants(facts).some((participant) => participant.id === input.participantId)
        ) {
          throw createTeamParticipantNotFoundError();
        }
      }
      validate(await find(access, input.teamId));
      const file = await storeUploadedFile({
        file: input.file,
        keyPrefix: `round2-confirmation/${input.teamId}/${input.participantId}/${input.documentType}`,
        kind: "pdf",
        storage,
        uploadedBy: access.actorId,
      });
      const replacement = await persistUploadedFile({
        data: file,
        log,
        persist: async (stored) =>
          await repository.replaceDocument(access, input, stored, validate),
        storage,
      });
      await cleanupReplacedFile({
        file: replacement.previous,
        log,
        repository: fileRepository,
        storage,
      });
      return {
        fileId: file.id,
        previousFileId: replacement.previous?.id ?? null,
        status: status(replacement.facts),
      };
    },
  };
}
export type Round2ConfirmationService = ReturnType<typeof createRound2ConfirmationService>;
