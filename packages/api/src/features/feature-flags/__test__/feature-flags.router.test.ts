import { call } from "@orpc/server";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { createAppRouter } from "../../../index";
import { createTestAuthReader, createTestContext } from "../../../__test__/test-support";

function createRouter(now: string, authenticated = true) {
  return createAppRouter({
    auth: createTestAuthReader(authenticated ? undefined : null),
    featureFlagClock: () => Temporal.Instant.from(now),
  });
}

async function getAll(router: ReturnType<typeof createAppRouter>) {
  return await call(router.featureFlags.getAll, undefined, {
    context: createTestContext().context,
    path: ["featureFlags", "getAll"],
  });
}

describe("feature flags", () => {
  it("returns availability calculated from the server clock", async () => {
    const router = createRouter("2026-09-24T00:00:00.000Z");

    await expect(getAll(router)).resolves.toStrictEqual({
      eligibleTeamsAnnouncement: true,
      finalRound: false,
      qualifyingResultsAnnouncement: false,
      qualifyingRound: false,
      registration: false,
    });
  });

  it("includes the start and excludes the end of registration", async () => {
    const atStart = createRouter("2026-08-18T17:00:00.000Z");
    const atEnd = createRouter("2026-09-20T17:00:00.000Z");

    await expect(getAll(atStart)).resolves.toMatchObject({ registration: true });
    await expect(getAll(atEnd)).resolves.toMatchObject({ registration: false });
  });

  it("keeps an open-ended flag available after its start", async () => {
    const beforeStart = createRouter("2026-09-26T01:59:59.999Z");
    const atStart = createRouter("2026-09-26T02:00:00.000Z");
    const longAfterStart = createRouter("2036-09-26T02:00:00.000Z");

    await expect(getAll(beforeStart)).resolves.toMatchObject({ qualifyingRound: false });
    await expect(getAll(atStart)).resolves.toMatchObject({ qualifyingRound: true });
    await expect(getAll(longAfterStart)).resolves.toMatchObject({ qualifyingRound: true });
  });

  it("returns feature availability to anonymous users", async () => {
    const router = createRouter("2026-09-24T00:00:00.000Z", false);

    await expect(getAll(router)).resolves.toMatchObject({
      eligibleTeamsAnnouncement: true,
      registration: false,
    });
  });
});
