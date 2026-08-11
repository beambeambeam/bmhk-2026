/* oxlint-disable require-await, no-nested-ternary, typescript/no-unsafe-assignment */
import { call } from "@orpc/server";
import type { DeleteObjectInput, GetPresignedInput, PutObjectInput } from "@bmhk-2026/s3";
import { describe, expect, it, vi } from "vitest";
import type {
  AuthReader,
  FileRepository,
  StoredFile,
  TeamParticipant,
  TeamParticipantRepository,
} from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
  createUnusedFileRepository,
  createUnusedTeamRepository,
} from "../../../__test__/test-support";
import type { TeamParticipantWithStoredDocuments } from "../team-participants.repository";

const s3Mocks = vi.hoisted(() => ({
  deleteObject: vi.fn<(input: DeleteObjectInput) => Promise<void>>(async () => {}),
  getPresigned: vi.fn<(input: GetPresignedInput) => Promise<string>>(
    async () => "https://storage.test/file",
  ),
  putObject: vi.fn<(input: PutObjectInput) => Promise<void>>(async () => {}),
}));
vi.mock(import("@bmhk-2026/s3"), () => s3Mocks);

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";
const PARTICIPANT_ID = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const participant = {
  academicRecordDocumentFileId: null,
  chronicConditionsAndFirstAidNotes: null,
  createdAt,
  dateOfBirth: "2010-01-01",
  dietaryRequirements: null,
  drugAllergies: null,
  email: "student@example.com",
  firstNameEn: "Student",
  firstNameTh: "นักเรียน",
  foodAllergies: null,
  id: PARTICIPANT_ID,
  identityDocumentFileId: null,
  index: 1,
  lastNameEn: "One",
  lastNameTh: "หนึ่ง",
  lineId: null,
  middleNameEn: null,
  middleNameTh: null,
  phone: "080-000-0000",
  portraitPhotoFileId: null,
  teamId: TEAM_ID,
  titleEn: "Mr.",
  titleTh: "นาย",
  updatedAt: createdAt,
} satisfies TeamParticipant;

const identityDocument = {
  bucket: "uploads",
  contentType: "application/pdf",
  id: "33333333-3333-4333-8333-333333333333",
  objectKey: `team-participants/${PARTICIPANT_ID}/documents/identity/33333333-3333-4333-8333-333333333333`,
  originalName: "identity.pdf",
  sizeBytes: 10,
  uploadedAt: createdAt,
  uploadedBy: USER_ID,
} satisfies StoredFile;

function createRepository(
  overrides: Partial<TeamParticipantRepository> = {},
): TeamParticipantRepository {
  return {
    create: overrides.create ?? (async (_userId, data) => ({ ...participant, ...data })),
    findBySlot:
      overrides.findBySlot ??
      (async () => ({
        ...participant,
        academicRecordDocument: null,
        identityDocument: null,
        portraitPhoto: null,
      })),
    listByTeamId:
      overrides.listByTeamId ??
      (async () => [
        {
          ...participant,
          academicRecordDocument: null,
          identityDocument: null,
          portraitPhoto: null,
        },
      ]),
    replaceDocument:
      overrides.replaceDocument ??
      (async (_userId, _teamId, _index, type, file) => ({
        participant: {
          ...participant,
          ...(type === "portraitPhoto"
            ? { portraitPhotoFileId: file.id }
            : type === "identityDocument"
              ? { identityDocumentFileId: file.id }
              : { academicRecordDocumentFileId: file.id }),
        },
        previous: null,
      })),
    update:
      overrides.update ?? (async (_userId, _teamId, _index, data) => ({ ...participant, ...data })),
  };
}

function createRouter(
  repository: TeamParticipantRepository,
  auth: AuthReader = createTestAuthReader(createTestSession()),
  fileRepository: FileRepository = createUnusedFileRepository(),
) {
  return createAppRouter({
    auth,
    files: fileRepository,
    teamParticipants: repository,
    teams: createUnusedTeamRepository(),
  }).teamParticipants;
}

function input() {
  return {
    dateOfBirth: "2010-01-01",
    email: " student@example.com ",
    firstNameEn: " Student ",
    firstNameTh: " นักเรียน ",
    index: 1,
    lastNameEn: " One ",
    lastNameTh: " หนึ่ง ",
    phone: " 080-000-0000 ",
    teamId: TEAM_ID,
    titleEn: " Mr. ",
    titleTh: " นาย ",
  };
}

describe("team participants router", () => {
  it("creates participant and normalizes input", async () => {
    const create = vi.fn<TeamParticipantRepository["create"]>(async (_userId, data) => ({
      ...participant,
      ...data,
    }));
    const router = createRouter(createRepository({ create }));
    const { context } = createTestContext();
    await expect(
      call(router.create, input(), { context, path: ["teamParticipants", "create"] }),
    ).resolves.toMatchObject({ email: "student@example.com", firstNameEn: "Student", index: 1 });
    expect(create).toHaveBeenCalledWith(USER_ID, {
      ...input(),
      email: "student@example.com",
      firstNameEn: "Student",
      firstNameTh: "นักเรียน",
      lastNameEn: "One",
      lastNameTh: "หนึ่ง",
      phone: "080-000-0000",
      titleEn: "Mr.",
      titleTh: "นาย",
    });
  });

  it("lists participants and returns empty list for owned team", async () => {
    const listByTeamId = vi.fn<TeamParticipantRepository["listByTeamId"]>(async () => []);
    const router = createRouter(createRepository({ listByTeamId }));
    const { context } = createTestContext();
    await expect(
      call(router.list, { teamId: TEAM_ID }, { context, path: ["teamParticipants", "list"] }),
    ).resolves.toStrictEqual([]);
    expect(listByTeamId).toHaveBeenCalledWith(USER_ID, TEAM_ID);
  });

  it("gets participant with signed document URLs", async () => {
    const file = {
      bucket: "uploads",
      contentType: "application/pdf",
      id: "33333333-3333-4333-8333-333333333333",
      objectKey: "participant.pdf",
      originalName: "participant.pdf",
      sizeBytes: 10,
      uploadedAt: createdAt,
      uploadedBy: USER_ID,
    } satisfies StoredFile;
    const row = {
      ...participant,
      academicRecordDocument: file,
      academicRecordDocumentFileId: file.id,
      identityDocument: null,
      portraitPhoto: null,
    } satisfies TeamParticipantWithStoredDocuments;
    const router = createRouter(createRepository({ findBySlot: async () => row }));
    const { context } = createTestContext();
    await expect(
      call(
        router.get,
        { index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "get"] },
      ),
    ).resolves.toMatchObject({
      academicRecordDocument: { id: file.id, url: "https://storage.test/file" },
      identityDocument: null,
      portraitPhoto: null,
    });
    expect(s3Mocks.getPresigned).toHaveBeenCalledOnce();
  });

  it("updates writable fields and rejects empty update", async () => {
    const update = vi.fn<TeamParticipantRepository["update"]>(
      async (_userId, _teamId, _index, data) => ({ ...participant, ...data }),
    );
    const router = createRouter(createRepository({ update }));
    const { context } = createTestContext();
    await expect(
      call(
        router.update,
        { data: { email: "new@example.com", foodAllergies: null }, index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "update"] },
      ),
    ).resolves.toMatchObject({ email: "new@example.com", foodAllergies: null });
    await expect(
      call(
        router.update,
        { data: {}, index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "update"] },
      ),
    ).rejects.toBeInstanceOf(Error);
  });

  it("accepts portrait image and rejects image for identity document", async () => {
    const router = createRouter(createRepository());
    const { context } = createTestContext();
    const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "portrait.png", {
      type: "image/png",
    });
    await expect(
      call(
        router.portraitPhoto,
        { file: png, index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "portraitPhoto"] },
      ),
    ).resolves.toMatchObject({ portraitPhotoFileId: expect.any(String) });
    const image = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], "identity.png", {
      type: "image/png",
    });
    await expect(
      call(
        router.identityDocument,
        { file: image, index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "identityDocument"] },
      ),
    ).rejects.toMatchObject({ code: "FILE_TYPE_NOT_ALLOWED", status: 415 });
  });

  it("deletes an uploaded document when participant persistence fails", async () => {
    const repository = createRepository({
      replaceDocument: async () => {
        throw new Error("database offline");
      },
    });
    const router = createRouter(repository);
    const { context } = createTestContext();
    const document = new File(["%PDF-1.7\n"], "identity.pdf", { type: "application/pdf" });
    s3Mocks.deleteObject.mockClear();

    await expect(
      call(
        router.identityDocument,
        { file: document, index: 1, teamId: TEAM_ID },
        { context, path: ["teamParticipants", "identityDocument"] },
      ),
    ).rejects.toThrow("database offline");
    const deleteInput = s3Mocks.deleteObject.mock.calls[0]?.[0];
    expect(deleteInput?.bucket).toBe("uploads");
    expect(deleteInput?.key).toMatch(
      new RegExp(`^team-participants/${PARTICIPANT_ID}/documents/identity/[0-9a-f-]{36}$`, "u"),
    );
  });

  it("deletes the previous participant document after replacement", async () => {
    const repository = createRepository({
      replaceDocument: async (_userId, _teamId, _index, _type, file) => ({
        participant: { ...participant, identityDocumentFileId: file.id },
        previous: identityDocument,
      }),
    });
    const deleteMetadata = vi.fn<FileRepository["delete"]>(async () => true);
    const fileRepository = { ...createUnusedFileRepository(), delete: deleteMetadata };
    const router = createRouter(
      repository,
      createTestAuthReader(createTestSession()),
      fileRepository,
    );
    const { context } = createTestContext();
    const document = new File(["%PDF-1.7\n"], "identity.pdf", { type: "application/pdf" });
    s3Mocks.deleteObject.mockClear();

    const updatedParticipant = await call(
      router.identityDocument,
      { file: document, index: 1, teamId: TEAM_ID },
      { context, path: ["teamParticipants", "identityDocument"] },
    );
    expect(updatedParticipant.identityDocumentFileId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(s3Mocks.deleteObject).toHaveBeenCalledWith({
      bucket: identityDocument.bucket,
      key: identityDocument.objectKey,
    });
    expect(deleteMetadata).toHaveBeenCalledWith(USER_ID, identityDocument.id);
  });

  it("requires authentication", async () => {
    const router = createRouter(createRepository(), createTestAuthReader(null));
    const { context } = createTestContext();
    await expect(
      call(router.create, input(), { context, path: ["teamParticipants", "create"] }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });
});
