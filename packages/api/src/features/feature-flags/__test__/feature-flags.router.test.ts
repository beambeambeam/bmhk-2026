import type { featureFlags } from "@bmhk-2026/feature-flags";
import { call } from "@orpc/server";
import { Temporal } from "temporal-polyfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createUnusedStaffDiscordLinkService,
} from "../../../__test__/test-support";

const config = vi.hoisted<{ round2Confirmation: { startsAt: string; endsAt?: string } }>(() => ({
  round2Confirmation: { startsAt: "2026-09-28T14:00:00+07:00" },
}));

// Schedule fixtures intentionally differ from the literal production dates.
// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock("@bmhk-2026/feature-flags", async (importOriginal) => {
  const original = await importOriginal<{ featureFlags: typeof featureFlags }>();
  return {
    ...original,
    featureFlags: {
      ...original.featureFlags,
      get round2Confirmation() {
        return config.round2Confirmation;
      },
    },
  };
});

function createRouter(now: string, authenticated = true) {
  return createAppRouter({
    auth: createTestAuthReader(authenticated ? undefined : null),
    featureFlagClock: () => Temporal.Instant.from(now),
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
  });
}

async function getAll(router: ReturnType<typeof createAppRouter>) {
  return await call(router.featureFlags.getAll, undefined, {
    context: createTestContext().context,
    path: ["featureFlags", "getAll"],
  });
}

describe("feature flags", () => {
  beforeEach(() => {
    config.round2Confirmation = { startsAt: "2026-09-28T14:00:00+07:00" };
  });

  it("returns availability calculated from the server clock", async () => {
    const router = createRouter("2026-09-24T00:00:00.000Z");

    await expect(getAll(router)).resolves.toStrictEqual({
      eligibleTeamsAnnouncement: true,
      finalRound: false,
      qualifyingResultsAnnouncement: false,
      qualifyingRound: false,
      qualifyingRoundIdentityConfirmation: true,
      registration: false,
      round2Confirmation: false,
    });
  });

  it("keeps round 2 confirmation closed until its schedule is configured", async () => {
    const router = createRouter("2036-09-24T00:00:00.000Z");

    await expect(getAll(router)).resolves.toMatchObject({ round2Confirmation: false });
  });

  it("includes the start and excludes the end of round 2 confirmation", async () => {
    config.round2Confirmation = {
      endsAt: "2026-10-02T18:00:00+07:00",
      startsAt: "2026-10-01T09:00:00+07:00",
    };
    const beforeStart = createRouter("2026-10-01T08:59:59.999+07:00");
    const atStart = createRouter("2026-10-01T09:00:00+07:00");
    const beforeEnd = createRouter("2026-10-02T17:59:59.999+07:00");
    const atEnd = createRouter("2026-10-02T18:00:00+07:00");

    await expect(getAll(beforeStart)).resolves.toMatchObject({ round2Confirmation: false });
    await expect(getAll(atStart)).resolves.toMatchObject({ round2Confirmation: true });
    await expect(getAll(beforeEnd)).resolves.toMatchObject({ round2Confirmation: true });
    await expect(getAll(atEnd)).resolves.toMatchObject({ round2Confirmation: false });
  });

  it("rejects round 2 confirmation schedules without explicit offsets", () => {
    config.round2Confirmation = {
      endsAt: "2026-10-02T18:00:00+07:00",
      startsAt: "2026-10-01T09:00:00",
    };
    expect(() => createRouter("2026-10-01T00:00:00Z")).toThrow(
      'Invalid startsAt for feature flag "round2Confirmation"',
    );
  });

  it("rejects round 2 confirmation schedules that end before they start", () => {
    config.round2Confirmation = {
      endsAt: "2026-10-01T09:00:00+07:00",
      startsAt: "2026-10-01T10:00:00+07:00",
    };
    expect(() => createRouter("2026-10-01T00:00:00Z")).toThrow(
      'Invalid window for feature flag "round2Confirmation"',
    );
  });

  it("includes the start and excludes the end of registration", async () => {
    const atStart = createRouter("2026-08-18T17:00:00.000Z");
    const atEnd = createRouter("2026-09-20T17:00:00.000Z");

    await expect(getAll(atStart)).resolves.toMatchObject({ registration: true });
    await expect(getAll(atEnd)).resolves.toMatchObject({ registration: false });
  });

  it("includes the start and excludes the end of qualifying round identity confirmation", async () => {
    const beforeStart = createRouter("2026-09-22T15:59:59.999+07:00");
    const atStart = createRouter("2026-09-22T16:00:00+07:00");
    const beforeEnd = createRouter("2026-09-27T12:59:59.999+07:00");
    const atEnd = createRouter("2026-09-27T13:00:00+07:00");

    await expect(getAll(beforeStart)).resolves.toMatchObject({
      qualifyingRoundIdentityConfirmation: false,
    });
    await expect(getAll(atStart)).resolves.toMatchObject({
      qualifyingRoundIdentityConfirmation: true,
    });
    await expect(getAll(beforeEnd)).resolves.toMatchObject({
      qualifyingRoundIdentityConfirmation: true,
    });
    await expect(getAll(atEnd)).resolves.toMatchObject({
      qualifyingRoundIdentityConfirmation: false,
    });
  });

  it("announces eligible teams at 16:00 GMT+7", async () => {
    const at1138 = createRouter("2026-09-22T11:38:00+07:00");
    const justBeforeStart = createRouter("2026-09-22T15:59:59.999+07:00");
    const atStart = createRouter("2026-09-22T16:00:00+07:00");

    await expect(getAll(at1138)).resolves.toMatchObject({
      eligibleTeamsAnnouncement: false,
    });
    await expect(getAll(justBeforeStart)).resolves.toMatchObject({
      eligibleTeamsAnnouncement: false,
    });
    await expect(getAll(atStart)).resolves.toMatchObject({
      eligibleTeamsAnnouncement: true,
    });
  });

  it("keeps an open-ended flag available after its start", async () => {
    const beforeStart = createRouter("2026-09-27T12:59:59.999+07:00");
    const atStart = createRouter("2026-09-27T13:00:00+07:00");
    const longAfterStart = createRouter("2036-09-26T02:00:00.000Z");

    await expect(getAll(beforeStart)).resolves.toMatchObject({ qualifyingRound: false });
    await expect(getAll(atStart)).resolves.toMatchObject({ qualifyingRound: true });
    await expect(getAll(longAfterStart)).resolves.toMatchObject({ qualifyingRound: true });
  });

  it("announces qualifying results at the published 14:00 GMT+7 time", async () => {
    const beforeStart = createRouter("2026-09-28T13:59:59.999+07:00");
    const atStart = createRouter("2026-09-28T14:00:00+07:00");

    await expect(getAll(beforeStart)).resolves.toMatchObject({
      qualifyingResultsAnnouncement: false,
    });
    await expect(getAll(atStart)).resolves.toMatchObject({
      qualifyingResultsAnnouncement: true,
    });
  });

  it("returns feature availability to anonymous users", async () => {
    const router = createRouter("2026-09-24T00:00:00.000Z", false);

    await expect(getAll(router)).resolves.toMatchObject({
      eligibleTeamsAnnouncement: true,
      registration: false,
    });
  });
});
