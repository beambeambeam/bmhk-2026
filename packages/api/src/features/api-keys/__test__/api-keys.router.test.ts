/* oxlint-disable require-await */
import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { ApiKeyRepository, AuthReader } from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
} from "../../../__test__/test-support";

const ACTOR_ID = "admin-1";

function createRepository(overrides: Partial<ApiKeyRepository> = {}): ApiKeyRepository {
  return {
    list: overrides.list ?? (async () => []),
    revoke: overrides.revoke ?? (async () => null),
  };
}

function createRouter(
  repository: ApiKeyRepository,
  auth: AuthReader = createTestAuthReader(
    createTestSession({ user: { id: ACTOR_ID, role: "admin" } }),
  ),
) {
  return createAppRouter({
    apiKeys: repository,
    auth,
  }).apiKeys;
}

describe("api keys router", () => {
  it("lists existing api keys", async () => {
    const rows = [
      {
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        enabled: true,
        expiresAt: null,
        id: "key-1",
        lastRequest: null,
        name: "Integration key",
        ownerEmail: "admin@example.com",
        ownerName: "Admin One",
        start: "bmhk_ab",
      },
    ];
    const list = vi.fn<ApiKeyRepository["list"]>(async () => rows);
    const router = createRouter(createRepository({ list }));
    const { context } = createTestContext();

    await expect(
      call(router.list, undefined, { context, path: ["apiKeys", "list"] }),
    ).resolves.toStrictEqual({ apiKeys: rows });
  });

  it("denies non-administrators from listing api keys", async () => {
    const list = vi.fn<ApiKeyRepository["list"]>();
    const router = createRouter(
      createRepository({ list }),
      createTestAuthReader(createTestSession({ user: { id: "staff-1", role: "staff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(router.list, undefined, { context, path: ["apiKeys", "list"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(list).not.toHaveBeenCalled();
  });

  it("creates an api key for the acting administrator and audits it without the raw key", async () => {
    const createApiKey = vi.fn<AuthReader["createApiKey"]>(async ({ name }) => ({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: null,
      id: "key-1",
      key: "plaintext-key-value",
      name,
      start: "bmhk_ab",
    }));
    const auth = createTestAuthReader(
      createTestSession({ user: { id: ACTOR_ID, role: "admin" } }),
      undefined,
      createApiKey,
    );
    const router = createRouter(createRepository(), auth);
    const { context, log } = createTestContext();

    await expect(
      call(router.create, { name: "Integration key" }, { context, path: ["apiKeys", "create"] }),
    ).resolves.toStrictEqual({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: null,
      id: "key-1",
      key: "plaintext-key-value",
      name: "Integration key",
      start: "bmhk_ab",
    });
    expect(createApiKey).toHaveBeenCalledWith({
      expiresIn: null,
      name: "Integration key",
      userId: ACTOR_ID,
    });
    expect(log.audit).toHaveBeenCalledWith({
      action: "api-key.created",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { after: { expiresAt: null, name: "Integration key" } },
      outcome: "success",
      target: { id: "key-1", type: "api-key" },
    });
  });

  it("converts expiresInDays to milliseconds before issuing the key", async () => {
    const createApiKey = vi.fn<AuthReader["createApiKey"]>(async ({ name }) => ({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-31T00:00:00.000Z"),
      id: "key-1",
      key: "plaintext-key-value",
      name,
      start: "bmhk_ab",
    }));
    const auth = createTestAuthReader(
      createTestSession({ user: { id: ACTOR_ID, role: "admin" } }),
      undefined,
      createApiKey,
    );
    const router = createRouter(createRepository(), auth);
    const { context } = createTestContext();

    await call(
      router.create,
      { expiresInDays: 30, name: "Integration key" },
      { context, path: ["apiKeys", "create"] },
    );

    expect(createApiKey).toHaveBeenCalledWith({
      expiresIn: 30 * 24 * 60 * 60 * 1000,
      name: "Integration key",
      userId: ACTOR_ID,
    });
  });

  it("revokes an api key by disabling it and audits the change", async () => {
    const revoke = vi.fn<ApiKeyRepository["revoke"]>(async (id) => ({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      enabled: false,
      expiresAt: null,
      id,
      lastRequest: null,
      name: "Integration key",
      ownerEmail: "admin@example.com",
      ownerName: "Admin One",
      start: "bmhk_ab",
    }));
    const router = createRouter(createRepository({ revoke }));
    const { context, log } = createTestContext();

    await expect(
      call(router.revoke, { id: "key-1" }, { context, path: ["apiKeys", "revoke"] }),
    ).resolves.toStrictEqual({
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      enabled: false,
      expiresAt: null,
      id: "key-1",
      lastRequest: null,
      name: "Integration key",
      ownerEmail: "admin@example.com",
      ownerName: "Admin One",
      start: "bmhk_ab",
    });
    expect(revoke).toHaveBeenCalledWith("key-1");
    expect(log.audit).toHaveBeenCalledWith({
      action: "api-key.revoked",
      actor: { id: ACTOR_ID, type: "user" },
      changes: { after: { enabled: false }, before: { enabled: true } },
      outcome: "success",
      target: { id: "key-1", type: "api-key" },
    });
  });

  it("audits a missing key as denied", async () => {
    const router = createRouter(createRepository({ revoke: async () => null }));
    const { context, log } = createTestContext();

    await expect(
      call(router.revoke, { id: "key-1" }, { context, path: ["apiKeys", "revoke"] }),
    ).rejects.toMatchObject({ code: "API_KEY_NOT_FOUND", status: 404 });
    expect(log.audit).toHaveBeenCalledWith({
      action: "api-key.revoked",
      actor: { id: ACTOR_ID, type: "user" },
      outcome: "denied",
      reason: "API_KEY_NOT_FOUND",
      target: { id: "key-1", type: "api-key" },
    });
  });
});
