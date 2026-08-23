import type {
  ApiContext,
  ApiSession,
  AuthReader,
  FileRepository,
  TeamAdvisorRepository,
  TeamConsentRepository,
  TeamRepository,
  TeamParticipantRepository,
} from "../index";
import { vi } from "vitest";

export interface TestSessionOverrides {
  session?: Partial<ApiSession["session"]>;
  user?: Partial<ApiSession["user"]>;
}

export function createTestSession(overrides: TestSessionOverrides = {}): ApiSession {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const expiresAt = new Date("2026-02-01T00:00:00.000Z");

  return {
    session: {
      createdAt,
      expiresAt,
      id: "session-1",
      impersonatedBy: null,
      token: "test-token",
      updatedAt: createdAt,
      userId: "user-1",
      ...overrides.session,
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt,
      displayUsername: "TestUser",
      email: "user@example.com",
      emailVerified: true,
      id: "user-1",
      image: null,
      name: "Test User",
      role: "user",
      updatedAt: createdAt,
      username: "testuser",
      ...overrides.user,
    },
  };
}

type TestSessionSource = ApiSession | null | AuthReader["getSession"];

export function createTestAuthReader(
  source: TestSessionSource = createTestSession(),
  verifyApiKey: AuthReader["verifyApiKey"] = createUnusedMethod("AuthReader", "verifyApiKey"),
  createApiKey: AuthReader["createApiKey"] = createUnusedMethod("AuthReader", "createApiKey"),
): AuthReader {
  return {
    createApiKey,
    getSession: typeof source === "function" ? source : async () => await Promise.resolve(source),
    verifyApiKey,
  };
}

function createTestLogger() {
  const audit = Object.assign(vi.fn<(...args: never[]) => void>(), {
    deny: vi.fn<(...args: never[]) => void>(),
  });

  return {
    audit,
    emit: vi.fn<() => null>(() => null),
    error: vi.fn<(error: Error) => void>(),
    getContext: vi.fn<() => Record<string, unknown>>(() => ({})),
    info: vi.fn<(...args: never[]) => void>(),
    set: vi.fn<(entry: Record<string, unknown>) => void>(),
    setLevel: vi.fn<(...args: never[]) => void>(),
    warn: vi.fn<(...args: never[]) => void>(),
  };
}

export function createTestContext(headers = new Headers()) {
  const log = createTestLogger();

  return {
    context: {
      headers,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      log: log as unknown as ApiContext["log"],
    } satisfies ApiContext,
    log,
  };
}

function createUnusedMethod(repository: string, method: string): () => Promise<never> {
  return async () =>
    await Promise.reject(new Error(`${repository}.${method} was called unexpectedly in API test`));
}

export function createUnusedFileRepository(): FileRepository {
  return {
    create: createUnusedMethod("FileRepository", "create"),
    deleteById: createUnusedMethod("FileRepository", "deleteById"),
    findById: createUnusedMethod("FileRepository", "findById"),
  };
}

export function createUnusedTeamRepository(): TeamRepository {
  return {
    create: createUnusedMethod("TeamRepository", "create"),
    delete: createUnusedMethod("TeamRepository", "delete"),
    findById: createUnusedMethod("TeamRepository", "findById"),
    findByUserId: createUnusedMethod("TeamRepository", "findByUserId"),
    list: createUnusedMethod("TeamRepository", "list"),
    replaceImage: createUnusedMethod("TeamRepository", "replaceImage"),
    setAward: createUnusedMethod("TeamRepository", "setAward"),
    update: createUnusedMethod("TeamRepository", "update"),
  };
}

export function createUnusedTeamAdvisorRepository(): TeamAdvisorRepository {
  return {
    create: createUnusedMethod("TeamAdvisorRepository", "create"),
    findByTeamId: createUnusedMethod("TeamAdvisorRepository", "findByTeamId"),
    replaceDocument: createUnusedMethod("TeamAdvisorRepository", "replaceDocument"),
    update: createUnusedMethod("TeamAdvisorRepository", "update"),
  };
}

export function createUnusedTeamConsentRepository(): TeamConsentRepository {
  return {
    create: createUnusedMethod("TeamConsentRepository", "create"),
    findByTeamId: createUnusedMethod("TeamConsentRepository", "findByTeamId"),
    update: createUnusedMethod("TeamConsentRepository", "update"),
  };
}

export function createUnusedTeamParticipantRepository(): TeamParticipantRepository {
  return {
    create: createUnusedMethod("TeamParticipantRepository", "create"),
    findBySlot: createUnusedMethod("TeamParticipantRepository", "findBySlot"),
    listByTeamId: createUnusedMethod("TeamParticipantRepository", "listByTeamId"),
    replaceDocument: createUnusedMethod("TeamParticipantRepository", "replaceDocument"),
    update: createUnusedMethod("TeamParticipantRepository", "update"),
  };
}
