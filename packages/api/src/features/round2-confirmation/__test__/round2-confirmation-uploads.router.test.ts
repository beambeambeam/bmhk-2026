import { call } from "@orpc/server";
import { createRound2RepositoryError } from "../round2-confirmation.errors";
import type {
  CreateStoredFileData,
  FileRepository,
  FileStorage,
  Round2ConfirmationFacts,
  Round2ConfirmationRepository,
  Round2DocumentInput,
  Round2DocumentType,
  StoredFile,
  Round2ConfirmationWindow,
} from "../../../index";
import { MAX_FILE_SIZE_BYTES, createAppRouter } from "../../../index";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TEAM_ID = "11111111-1111-4111-8111-111111111112";
const PARTICIPANT_IDS = [
  "22222222-2222-4222-8222-222222222221",
  "22222222-2222-4222-8222-222222222222",
] as const;
const OTHER_PARTICIPANT_IDS = [
  "22222222-2222-4222-8222-222222222223",
  "22222222-2222-4222-8222-222222222224",
] as const;
const INACTIVE_PARTICIPANT_ID = "22222222-2222-4222-8222-222222222225";
const OWNER_ID = "user-1";
const OTHER_OWNER_ID = "user-2";
const ROUND2_WINDOW = {
  endsAt: "2026-10-03T00:00:00+07:00",
  startsAt: "2026-10-01T00:00:00+07:00",
} satisfies Round2ConfirmationWindow;
const OPEN_TIME = "2026-10-02T00:00:00+07:00";
const IDENTITY_FILE_ID = "33333333-3333-4333-8333-333333333333";

interface MutableTeam extends Round2ConfirmationFacts {
  ownerId: string;
}

interface Clock {
  value: string;
}

interface RigOptions {
  beforeReplace?: (team: MutableTeam, clock: Clock) => void;
  clock?: Clock;
  failPersistence?: boolean;
  failStorageUpload?: boolean;
  existingFiles?: readonly StoredFile[];
  teams?: readonly MutableTeam[];
}

function makeTeam(
  teamId: string,
  ownerId: string,
  participantIds: readonly string[],
  memberCount = participantIds.length,
): MutableTeam {
  return {
    award: "ADVANCED_TO_ROUND_2",
    confirmedAt: null,
    memberCount,
    ownerId,
    participants: participantIds.map((id, index) => ({
      id,
      identityDocumentFileId: null,
      index: index + 1,
      studentIdDocumentFileId: null,
    })),
    teamId,
  };
}

function toFacts(team: MutableTeam): Round2ConfirmationFacts {
  return {
    award: team.award,
    confirmedAt: team.confirmedAt,
    memberCount: team.memberCount,
    participants: team.participants.map((participant) => ({ ...participant })),
    teamId: team.teamId,
  };
}

function setParticipantDocument(
  team: MutableTeam,
  index: number,
  document: Partial<MutableTeam["participants"][number]>,
): void {
  const participant = team.participants[index];
  if (!participant) {
    throw new Error("Expected participant fixture");
  }
  team.participants[index] = { ...participant, ...document };
}

function toStoredFile(data: CreateStoredFileData): StoredFile {
  return { ...data, uploadedAt: new Date("2026-10-02T00:00:00.000Z") };
}

function createStoredFile(id: string): StoredFile {
  return {
    bucket: "uploads",
    contentType: "application/pdf",
    id,
    objectKey: `round2-confirmation/${TEAM_ID}/participant/identityDocument/${id}`,
    originalName: "identity-card.pdf",
    sizeBytes: 16,
    uploadedAt: new Date("2026-10-01T00:00:00.000Z"),
    uploadedBy: OWNER_ID,
  };
}

function pdfFile(name = "card.pdf"): File {
  return new File(["%PDF-1.7\ncard document"], name, { type: "application/pdf" });
}

function createRig(options: RigOptions = {}) {
  const clock = options.clock ?? { value: OPEN_TIME };
  const teams = new Map<string, MutableTeam>();
  for (const team of options.teams ?? [makeTeam(TEAM_ID, OWNER_ID, PARTICIPANT_IDS)]) {
    teams.set(team.teamId, team);
  }

  const storedFiles = new Map<string, StoredFile>();
  for (const file of options.existingFiles ?? []) {
    storedFiles.set(file.id, file);
  }

  const uploadedObjects: { bucket: string; objectKey: string }[] = [];
  const deletedObjects: { bucket: string; objectKey: string }[] = [];
  const deletedFileIds: string[] = [];
  const storage: FileStorage = {
    bucket: "uploads",
    delete: async ({ bucket, objectKey }) => {
      deletedObjects.push({ bucket, objectKey });
      await Promise.resolve();
    },
    getDownloadUrl: async ({ objectKey }) =>
      await Promise.resolve(`https://files.example/${objectKey}`),
    upload: async ({ bucket, objectKey }) => {
      if (options.failStorageUpload === true) {
        throw new Error("storage offline");
      }
      uploadedObjects.push({ bucket, objectKey });
      await Promise.resolve();
    },
  };

  function findAccessibleTeam(
    access: { actorId: string; scope: "ALL_TEAMS" | "OWN_TEAM" },
    teamId?: string,
  ) {
    for (const team of teams.values()) {
      const matchesTeam = teamId === undefined || team.teamId === teamId;
      const isAccessible = access.scope === "ALL_TEAMS" || team.ownerId === access.actorId;
      if (matchesTeam && isAccessible) {
        return team;
      }
    }
    return null;
  }

  const fileRepository: FileRepository = {
    create: async (data) => {
      const file = toStoredFile(data);
      storedFiles.set(file.id, file);
      return await Promise.resolve(file);
    },
    deleteById: async (id) => {
      deletedFileIds.push(id);
      return await Promise.resolve(storedFiles.delete(id));
    },
    findById: async (_userId, id) => await Promise.resolve(storedFiles.get(id) ?? null),
  };

  const repository: Round2ConfirmationRepository = {
    findDocument: async (access, input) => {
      const team = findAccessibleTeam(access, input.teamId);
      const participant = team?.participants.find((item) => item.id === input.participantId);
      if (!participant) {
        return await Promise.resolve(null);
      }
      const fileId =
        input.documentType === "identityDocument"
          ? participant.identityDocumentFileId
          : participant.studentIdDocumentFileId;
      return await Promise.resolve(fileId === null ? null : (storedFiles.get(fileId) ?? null));
    },
    findFacts: async (access, teamId) => {
      const team = findAccessibleTeam(access, teamId);
      return await Promise.resolve(team ? toFacts(team) : null);
    },
    replaceDocument: async (access, input, file, validate) => {
      const team = findAccessibleTeam(access, input.teamId);
      if (!team) {
        throw new Error("Team is not accessible");
      }
      options.beforeReplace?.(team, clock);
      validate(toFacts(team));
      if (options.failPersistence === true) {
        throw createRound2RepositoryError(new Error("database offline"));
      }

      let selectedParticipant: MutableTeam["participants"][number] | undefined;
      for (const participant of team.participants) {
        if (participant.id === input.participantId) {
          selectedParticipant = participant;
          break;
        }
      }
      if (!selectedParticipant) {
        throw new Error("Participant is not in the team");
      }
      const currentParticipant = selectedParticipant;

      const previousFileId =
        input.documentType === "identityDocument"
          ? currentParticipant.identityDocumentFileId
          : currentParticipant.studentIdDocumentFileId;
      const previous = previousFileId === null ? null : (storedFiles.get(previousFileId) ?? null);
      const updatedParticipant =
        input.documentType === "identityDocument"
          ? { ...currentParticipant, identityDocumentFileId: file.id }
          : { ...currentParticipant, studentIdDocumentFileId: file.id };
      team.participants = team.participants.map((participant) =>
        participant.id === input.participantId ? updatedParticipant : participant,
      );
      storedFiles.set(file.id, toStoredFile(file));

      return await Promise.resolve({ facts: toFacts(team), previous });
    },
    submit: async (access, teamId, validate, confirmedAt) => {
      const team = findAccessibleTeam(access, teamId);
      if (!team) {
        throw new Error("Team is not accessible");
      }
      validate(toFacts(team));
      team.confirmedAt = confirmedAt;
      return await Promise.resolve(toFacts(team));
    },
  };

  return {
    clock,
    deletedFileIds,
    deletedObjects,
    fileRepository,
    repository,
    storage,
    storedFiles,
    uploadedObjects,
  };
}

function createRouter(
  rig: ReturnType<typeof createRig>,
  {
    actorId = OWNER_ID,
    role = "user",
  }: { actorId?: string; role?: "user" | "registrationStaff" } = {},
) {
  return createAppRouter({
    auth: createTestAuthReader(createTestSession({ user: { id: actorId, role } })),
    featureFlagClock: () => Temporal.Instant.from(rig.clock.value),
    fileStorage: rig.storage,
    files: rig.fileRepository,
    round2Confirmation: rig.repository,
    round2ConfirmationWindow: ROUND2_WINDOW,
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
  });
}

function uploadInput(
  participantId: string,
  documentType: Round2DocumentType,
  file = pdfFile(),
): Round2DocumentInput & { file: File; teamId: string } {
  return { documentType, file, participantId, teamId: TEAM_ID };
}

describe("round 2 confirmation document routes", () => {
  it("accepts PDF uploads for both card types and keeps the confirmation in draft", async () => {
    const rig = createRig();
    const router = createRouter(rig);
    const inputs = PARTICIPANT_IDS.flatMap((participantId) =>
      (["identityDocument", "studentIdDocument"] as const).map((documentType) =>
        uploadInput(participantId, documentType),
      ),
    );

    let uploadIndex = 0;
    for (const input of inputs) {
      const { context } = createTestContext();
      // Each status must observe the documents uploaded before it.
      // oxlint-disable-next-line no-await-in-loop
      const result = await call(router.round2Confirmation.uploadDocument, input, { context });

      expect(result.state).toBe("DRAFT");
      expect(result.isComplete).toBe(uploadIndex === inputs.length - 1);
      uploadIndex += 1;
    }

    expect(rig.uploadedObjects).toHaveLength(4);
    expect(
      rig.uploadedObjects.every(({ objectKey }) => objectKey.includes("round2-confirmation")),
    ).toBeTruthy();
  });

  it("rejects non-PDF and oversized card documents before storing them", async () => {
    const rig = createRig();
    const router = createRouter(rig);
    const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "card.png", {
      type: "image/png",
    });
    const oversizedPdf = new File(
      ["%PDF-1.7\n", new Uint8Array(MAX_FILE_SIZE_BYTES + 1)],
      "large-card.pdf",
      { type: "application/pdf" },
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument", png),
        { context },
      ),
    ).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED", status: 415 });
    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "studentIdDocument", oversizedPdf),
        { context },
      ),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE", status: 413 });

    expect(rig.uploadedObjects).toHaveLength(0);
  });

  it("prevents owners and registration staff from uploading for another team", async () => {
    const rig = createRig({
      teams: [
        makeTeam(TEAM_ID, OWNER_ID, PARTICIPANT_IDS),
        makeTeam(OTHER_TEAM_ID, OTHER_OWNER_ID, OTHER_PARTICIPANT_IDS),
      ],
    });
    const ownerRouter = createRouter(rig);
    const staffRouter = createRouter(rig, { actorId: "staff-1", role: "registrationStaff" });
    const { context: ownerContext } = createTestContext();
    const { context: staffContext } = createTestContext();

    await expect(
      call(
        ownerRouter.round2Confirmation.uploadDocument,
        { ...uploadInput(OTHER_PARTICIPANT_IDS[0], "identityDocument"), teamId: OTHER_TEAM_ID },
        { context: ownerContext },
      ),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
    await expect(
      call(
        staffRouter.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
        { context: staffContext },
      ),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });

    expect(rig.uploadedObjects).toHaveLength(0);
  });

  it("rejects uploads for an inactive third participant even when the stored row exists", async () => {
    const inactiveFile = createStoredFile(IDENTITY_FILE_ID);
    const team = makeTeam(TEAM_ID, OWNER_ID, [...PARTICIPANT_IDS, INACTIVE_PARTICIPANT_ID], 2);
    setParticipantDocument(team, 2, { identityDocumentFileId: inactiveFile.id });
    const rig = createRig({ existingFiles: [inactiveFile], teams: [team] });
    const router = createRouter(rig);
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(INACTIVE_PARTICIPANT_ID, "identityDocument"),
        { context },
      ),
    ).rejects.toMatchObject({ code: "TEAM_PARTICIPANT_NOT_FOUND", status: 404 });

    expect(rig.uploadedObjects).toHaveLength(0);
  });

  it("allows owners and registration staff to fetch round 2 documents", async () => {
    const identityFile = createStoredFile(IDENTITY_FILE_ID);
    const team = makeTeam(TEAM_ID, OWNER_ID, PARTICIPANT_IDS);
    setParticipantDocument(team, 0, { identityDocumentFileId: identityFile.id });
    const rig = createRig({ existingFiles: [identityFile], teams: [team] });
    const ownerRouter = createRouter(rig);
    const staffRouter = createRouter(rig, { actorId: "staff-1", role: "registrationStaff" });
    const ownerContext = createTestContext();
    const staffContext = createTestContext();
    const input = {
      documentType: "identityDocument",
      participantId: PARTICIPANT_IDS[0],
      teamId: TEAM_ID,
    } as const;

    const ownerFile = await call(ownerRouter.round2Confirmation.document, input, {
      context: ownerContext.context,
    });
    const staffFile = await call(staffRouter.round2Confirmation.document, input, {
      context: staffContext.context,
    });

    expect(ownerFile).toStrictEqual({
      contentType: "application/pdf",
      id: IDENTITY_FILE_ID,
      originalName: identityFile.originalName,
      sizeBytes: identityFile.sizeBytes,
      uploadedAt: identityFile.uploadedAt,
      url: `https://files.example/${identityFile.objectKey}`,
    });
    expect(staffFile).toStrictEqual({
      contentType: "application/pdf",
      id: IDENTITY_FILE_ID,
      originalName: identityFile.originalName,
      sizeBytes: identityFile.sizeBytes,
      uploadedAt: identityFile.uploadedAt,
      url: `https://files.example/${identityFile.objectKey}`,
    });
    expect(ownerContext.log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "round2-document.accessed", outcome: "success" }),
    );
    expect(staffContext.log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "round2-document.accessed", outcome: "success" }),
    );
  });

  it("audits denied and missing document access", async () => {
    const identityFile = createStoredFile(IDENTITY_FILE_ID);
    const team = makeTeam(TEAM_ID, OWNER_ID, PARTICIPANT_IDS);
    setParticipantDocument(team, 0, { identityDocumentFileId: identityFile.id });
    const rig = createRig({ existingFiles: [identityFile], teams: [team] });
    const foreignOwnerRouter = createRouter(rig, { actorId: OTHER_OWNER_ID });
    const ownerRouter = createRouter(rig);
    const foreignContext = createTestContext();
    const missingContext = createTestContext();
    const input = {
      documentType: "identityDocument",
      participantId: PARTICIPANT_IDS[0],
      teamId: TEAM_ID,
    } as const;

    await expect(
      call(foreignOwnerRouter.round2Confirmation.document, input, {
        context: foreignContext.context,
      }),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND", status: 404 });
    await expect(
      call(
        ownerRouter.round2Confirmation.document,
        { ...input, documentType: "studentIdDocument", participantId: PARTICIPANT_IDS[1] },
        { context: missingContext.context },
      ),
    ).rejects.toMatchObject({ code: "FILE_NOT_FOUND", status: 404 });
    expect(foreignContext.log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "round2-document.accessed",
        outcome: "denied",
        reason: "FILE_NOT_FOUND",
      }),
    );
    expect(missingContext.log.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "round2-document.accessed",
        outcome: "denied",
        reason: "FILE_NOT_FOUND",
      }),
    );
  });

  it("reports storage errors without persisting file metadata", async () => {
    const rig = createRig({ failStorageUpload: true });
    const router = createRouter(rig);
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
        { context },
      ),
    ).rejects.toMatchObject({ code: "FILE_STORAGE_UNAVAILABLE", status: 503 });

    expect(rig.uploadedObjects).toHaveLength(0);
    expect(rig.storedFiles.size).toBe(0);
  });

  it("deletes the uploaded object when saving its metadata fails", async () => {
    const rig = createRig({ failPersistence: true });
    const router = createRouter(rig);
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
        { context },
      ),
    ).rejects.toMatchObject({ code: "ROUND2_CONFIRMATION_REPOSITORY_ERROR", status: 500 });

    expect(rig.uploadedObjects).toHaveLength(1);
    expect(rig.deletedObjects).toStrictEqual(rig.uploadedObjects);
    expect(rig.storedFiles.size).toBe(0);
  });

  it("removes the replaced card object and file metadata after a successful replacement", async () => {
    const previousFile = createStoredFile(IDENTITY_FILE_ID);
    const team = makeTeam(TEAM_ID, OWNER_ID, PARTICIPANT_IDS);
    setParticipantDocument(team, 0, { identityDocumentFileId: previousFile.id });
    const rig = createRig({ existingFiles: [previousFile], teams: [team] });
    const router = createRouter(rig);
    const { context } = createTestContext();

    const result = await call(
      router.round2Confirmation.uploadDocument,
      uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
      { context },
    );

    expect(result.participants[0]?.identityDocumentFileId).not.toBe(previousFile.id);
    expect(rig.deletedObjects).toStrictEqual([
      { bucket: previousFile.bucket, objectKey: previousFile.objectKey },
    ]);
    expect(rig.deletedFileIds).toStrictEqual([previousFile.id]);
  });

  it("rolls back an upload when its atomic save sees that confirmation was submitted", async () => {
    const rig = createRig({
      beforeReplace: (team) => {
        team.confirmedAt = new Date("2026-10-02T00:00:00.000Z");
      },
    });
    const router = createRouter(rig);
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
        { context },
      ),
    ).rejects.toMatchObject({ code: "ROUND2_CONFIRMATION_ALREADY_SUBMITTED", status: 409 });

    expect(rig.uploadedObjects).toHaveLength(1);
    expect(rig.deletedObjects).toStrictEqual(rig.uploadedObjects);
    expect(rig.storedFiles.size).toBe(0);
  });

  it("rolls back an upload when its atomic save sees the confirmation window close", async () => {
    const rig = createRig({
      beforeReplace: (_team, clock) => {
        clock.value = ROUND2_WINDOW.endsAt;
      },
    });
    const router = createRouter(rig);
    const { context } = createTestContext();

    await expect(
      call(
        router.round2Confirmation.uploadDocument,
        uploadInput(PARTICIPANT_IDS[0], "identityDocument"),
        { context },
      ),
    ).rejects.toMatchObject({ code: "ROUND2_CONFIRMATION_CLOSED", status: 409 });

    expect(rig.uploadedObjects).toHaveLength(1);
    expect(rig.deletedObjects).toStrictEqual(rig.uploadedObjects);
    expect(rig.storedFiles.size).toBe(0);
  });
});
