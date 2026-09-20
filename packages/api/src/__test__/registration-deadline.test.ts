import { call } from "@orpc/server";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it, vi } from "vitest";

import type { TeamRepository } from "../index";
import { createAppRouter } from "../index";
import {
  createTestAuthReader,
  createTestContext,
  createUnusedFileRepository,
  createUnusedStaffDiscordLinkService,
  createUnusedTeamAdvisorRepository,
  createUnusedTeamConsentRepository,
  createUnusedTeamParticipantRepository,
  createUnusedTeamRepository,
} from "./test-support";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const REGISTRATION_DEADLINE = "2026-09-20T00:00:00+07:00";

interface ClosedMutation {
  invoke: (router: ReturnType<typeof createAppRouter>) => Promise<unknown>;
  name: string;
}

function createClosedRouter() {
  return createAppRouter({
    auth: createTestAuthReader(),
    featureFlagClock: () => Temporal.Instant.from(REGISTRATION_DEADLINE),
    files: createUnusedFileRepository(),
    staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
    teamAdvisors: createUnusedTeamAdvisorRepository(),
    teamConsents: createUnusedTeamConsentRepository(),
    teamParticipants: createUnusedTeamParticipantRepository(),
    teams: createUnusedTeamRepository(),
  });
}

function uploadedFile(): File {
  return new File(["%PDF-1.7\n"], "document.pdf", { type: "application/pdf" });
}

const closedMutations = [
  {
    invoke: async (router) =>
      await call(
        router.teams.update,
        { data: { name: "Updated Team" }, id: TEAM_ID },
        { context: createTestContext().context, path: ["teams", "update"] },
      ),
    name: "team edits",
  },
  {
    invoke: async (router) =>
      await call(
        router.teams.image,
        { file: uploadedFile(), id: TEAM_ID },
        { context: createTestContext().context, path: ["teams", "image"] },
      ),
    name: "team image uploads",
  },
  {
    invoke: async (router) =>
      await call(
        router.files.upload,
        { file: uploadedFile() },
        { context: createTestContext().context, path: ["files", "upload"] },
      ),
    name: "file uploads",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamAdvisors.update,
        { data: { email: "updated@example.com" }, teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamAdvisors", "update"] },
      ),
    name: "advisor edits",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamAdvisors.identityDocument,
        { file: uploadedFile(), teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamAdvisors", "identityDocument"] },
      ),
    name: "advisor document uploads",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamParticipants.update,
        { data: { email: "updated@example.com" }, index: 1, teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamParticipants", "update"] },
      ),
    name: "participant edits",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamParticipants.identityDocument,
        { file: uploadedFile(), index: 1, teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamParticipants", "identityDocument"] },
      ),
    name: "participant document uploads",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamConsents.update,
        { data: { privacyPolicyAccepted: true }, teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamConsents", "update"] },
      ),
    name: "consent updates",
  },
  {
    invoke: async (router) =>
      await call(
        router.teamRegistrationStatus.submit,
        { teamId: TEAM_ID },
        { context: createTestContext().context, path: ["teamRegistrationStatus", "submit"] },
      ),
    name: "final submission",
  },
] satisfies readonly ClosedMutation[];

describe("registration deadline", () => {
  it("rejects team creation after the registration deadline", async () => {
    const create = vi.fn<TeamRepository["create"]>(
      async () =>
        await Promise.reject(new Error("TeamRepository.create should not run after the deadline")),
    );
    const router = createAppRouter({
      auth: createTestAuthReader(),
      featureFlagClock: () => Temporal.Instant.from(REGISTRATION_DEADLINE),
      files: createUnusedFileRepository(),
      staffDiscordLinkService: createUnusedStaffDiscordLinkService(),
      teams: { ...createUnusedTeamRepository(), create },
    });

    await expect(
      call(
        router.teams.create,
        { name: "Team One", school: "Test School" },
        { context: createTestContext().context, path: ["teams", "create"] },
      ),
    ).rejects.toMatchObject({
      code: "REGISTRATION_CLOSED",
      status: 403,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each(closedMutations)("rejects $name after the registration deadline", async ({ invoke }) => {
    await expect(invoke(createClosedRouter())).rejects.toMatchObject({
      code: "REGISTRATION_CLOSED",
      status: 403,
    });
  });
});
