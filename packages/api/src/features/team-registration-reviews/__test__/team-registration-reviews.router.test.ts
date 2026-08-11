import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type {
  AuthReader,
  TeamRegistrationReview,
  TeamRegistrationReviewRepository,
} from "../../../index";
import { createAppRouter } from "../../../index";
import {
  createTestAuthReader,
  createTestContext,
  createTestSession,
} from "../../../__test__/test-support";
import { createTeamRegistrationReviewRepositoryError } from "../team-registration-reviews.errors";

const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const TEAM_ID = "11111111-1111-4111-8111-111111111111";
const REVIEWED_AT = new Date("2026-08-11T06:00:00.000Z");

const approvedReview = {
  advisorIssueCodes: [],
  createdAt: REVIEWED_AT,
  id: REVIEW_ID,
  internalNotes: "Documents checked against originals",
  participant1IssueCodes: [],
  participant2IssueCodes: [],
  participant3IssueCodes: [],
  reviewedAt: REVIEWED_AT,
  reviewedByUserId: "operator-1",
  status: "APPROVED",
  teamId: TEAM_ID,
  updatedAt: REVIEWED_AT,
} satisfies TeamRegistrationReview;

function createRouter(repository: TeamRegistrationReviewRepository, auth: AuthReader) {
  return createAppRouter({
    auth,
    teamRegistrationReviews: repository,
  }).teamRegistrationReviews;
}

describe("team registration reviews router", () => {
  it("keeps reviews private from Team Owners", async () => {
    const findByTeamId = vi.fn<TeamRegistrationReviewRepository["findByTeamId"]>(
      async () => await Promise.resolve({ review: approvedReview, teamId: TEAM_ID }),
    );
    const router = createRouter(
      {
        findByTeamId,
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationReviews", "get"] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(findByTeamId).not.toHaveBeenCalled();
  });

  it("returns the private review to a Registration Operator without auditing the read", async () => {
    const router = createRouter(
      {
        findByTeamId: async () =>
          await Promise.resolve({ review: approvedReview, teamId: TEAM_ID }),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })),
    );
    const { context, log } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationReviews", "get"] }),
    ).resolves.toStrictEqual(approvedReview);
    expect(log.audit).not.toHaveBeenCalled();
  });

  it("returns null when the Team exists but has not been reviewed", async () => {
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve({ review: null, teamId: TEAM_ID }),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationReviews", "get"] }),
    ).resolves.toBeNull();
  });

  it("returns Team not found when the reviewed Team does not exist", async () => {
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(router.get, { teamId: TEAM_ID }, { context, path: ["teamRegistrationReviews", "get"] }),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
  });

  it("lets a Registration Operator save a review and audits the material decision", async () => {
    const save = vi.fn<TeamRegistrationReviewRepository["save"]>(async (access, teamId, data) => {
      expect(access).toStrictEqual({ actorId: "operator-1", scope: "ALL_TEAMS" });
      expect(teamId).toBe(TEAM_ID);
      expect(data).toMatchObject({
        advisorIssueCodes: [],
        internalNotes: "Documents checked against originals",
        participant1IssueCodes: [],
        participant2IssueCodes: [],
        participant3IssueCodes: [],
        reviewedByUserId: "operator-1",
        status: "APPROVED",
      });
      expect(data.reviewedAt).toBeInstanceOf(Date);

      return await Promise.resolve({ previous: null, review: approvedReview });
    });
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save,
      },
      createTestAuthReader(
        createTestSession({ user: { id: "operator-1", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.save,
        {
          data: {
            advisorIssueCodes: [],
            internalNotes: "Documents checked against originals",
            participant1IssueCodes: [],
            participant2IssueCodes: [],
            participant3IssueCodes: [],
            status: "APPROVED",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "save"] },
      ),
    ).resolves.toStrictEqual(approvedReview);
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration-review.changed",
      actor: { id: "operator-1", type: "user" },
      changes: {
        after: {
          advisorIssueCodes: [],
          participant1IssueCodes: [],
          participant2IssueCodes: [],
          participant3IssueCodes: [],
          status: "APPROVED",
        },
      },
      outcome: "success",
      target: {
        id: TEAM_ID,
        reviewId: REVIEW_ID,
        teamId: TEAM_ID,
        type: "team-registration-review",
      },
    });
  });

  it("rejects approval while review issues remain", async () => {
    const save = vi.fn<TeamRegistrationReviewRepository["save"]>(
      async () => await Promise.resolve({ previous: null, review: approvedReview }),
    );
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save,
      },
      createTestAuthReader(
        createTestSession({ user: { id: "operator-1", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.save,
        {
          data: {
            advisorIssueCodes: ["IDENTITY_DOCUMENT_UNREADABLE"],
            internalNotes: null,
            participant1IssueCodes: [],
            participant2IssueCodes: [],
            participant3IssueCodes: [],
            status: "APPROVED",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "save"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(save).not.toHaveBeenCalled();
    expect(log.audit).not.toHaveBeenCalled();
  });

  it("rejects a change request without a coded review issue", async () => {
    const save = vi.fn<TeamRegistrationReviewRepository["save"]>(
      async () => await Promise.resolve({ previous: null, review: approvedReview }),
    );
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save,
      },
      createTestAuthReader(
        createTestSession({ user: { id: "operator-1", role: "registrationStaff" } }),
      ),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.save,
        {
          data: {
            advisorIssueCodes: [],
            internalNotes: "Missing document",
            participant1IssueCodes: [],
            participant2IssueCodes: [],
            participant3IssueCodes: [],
            status: "CHANGES_REQUESTED",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "save"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects client-controlled reviewer metadata", async () => {
    const save = vi.fn<TeamRegistrationReviewRepository["save"]>(
      async () => await Promise.resolve({ previous: null, review: approvedReview }),
    );
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save,
      },
      createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.save,
        {
          data: {
            advisorIssueCodes: [],
            internalNotes: null,
            participant1IssueCodes: [],
            participant2IssueCodes: [],
            participant3IssueCodes: [],
            // @ts-expect-error -- verifies runtime rejection of server-controlled metadata
            reviewedByUserId: "forged-operator",
            status: "APPROVED",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "save"] },
      ),
    ).rejects.toBeInstanceOf(Error);
    expect(save).not.toHaveBeenCalled();
  });

  it("audits a failed material review change with a sanitized reason", async () => {
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save: async () => await Promise.reject(createTeamRegistrationReviewRepositoryError()),
      },
      createTestAuthReader(
        createTestSession({ user: { id: "operator-1", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.save,
        {
          data: {
            advisorIssueCodes: [],
            internalNotes: null,
            participant1IssueCodes: [],
            participant2IssueCodes: [],
            participant3IssueCodes: [],
            status: "APPROVED",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "save"] },
      ),
    ).rejects.toMatchObject({
      code: "TEAM_REGISTRATION_REVIEW_REPOSITORY_ERROR",
      status: 500,
    });
    expect(log.audit).toHaveBeenCalledWith({
      action: "team-registration-review.changed",
      actor: { id: "operator-1", type: "user" },
      outcome: "failure",
      reason: "TEAM_REGISTRATION_REVIEW_REPOSITORY_ERROR",
      target: {
        id: TEAM_ID,
        teamId: TEAM_ID,
        type: "team-registration-review",
      },
    });
  });
});
