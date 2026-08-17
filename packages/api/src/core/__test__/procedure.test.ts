/* oxlint-disable require-await */
import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { createTestAuthReader, createTestContext } from "../../__test__/test-support";
import { createProcedures } from "../procedure";

function createRouter(verifyApiKey?: Parameters<typeof createTestAuthReader>[1]) {
  const { apiKeyProcedure } = createProcedures({
    auth: createTestAuthReader(undefined, verifyApiKey),
  });

  return apiKeyProcedure.handler(({ context }) => context.apiKey);
}

describe("api key procedure", () => {
  it("rejects a request with no api key header", async () => {
    const procedure = createRouter();
    const { context } = createTestContext();

    await expect(call(procedure, undefined, { context, path: ["test"] })).rejects.toMatchObject({
      code: "API_KEY_MISSING",
      status: 401,
    });
  });

  it("rejects an invalid api key", async () => {
    const procedure = createRouter(async () => ({ key: null, valid: false }));
    const { context } = createTestContext(new Headers({ "x-api-key": "bad-key" }));

    await expect(call(procedure, undefined, { context, path: ["test"] })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("passes through the verified key on success", async () => {
    const procedure = createRouter(async () => ({
      key: { id: "key-1", referenceId: "user-1" },
      valid: true,
    }));
    const { context } = createTestContext(new Headers({ "x-api-key": "good-key" }));

    await expect(call(procedure, undefined, { context, path: ["test"] })).resolves.toStrictEqual({
      id: "key-1",
      referenceId: "user-1",
    });
  });

  it("reports the key verification service as unavailable on failure", async () => {
    const procedure = createRouter(async () => {
      throw new Error("network down");
    });
    const { context } = createTestContext(new Headers({ "x-api-key": "good-key" }));

    await expect(call(procedure, undefined, { context, path: ["test"] })).rejects.toMatchObject({
      code: "API_KEY_VERIFICATION_UNAVAILABLE",
      status: 503,
    });
  });
});
