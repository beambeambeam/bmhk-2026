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
  advisorNotes: null,
  advisorReviewedAt: null,
  createdAt: REVIEWED_AT,
  id: REVIEW_ID,
  internalNotes: "Documents checked against originals",
  participant1IssueCodes: [],
  participant1Notes: null,
  participant1ReviewedAt: null,
  participant2IssueCodes: [],
  participant2Notes: null,
  participant2ReviewedAt: null,
  participant3IssueCodes: [],
  participant3Notes: null,
  participant3ReviewedAt: null,
  reviewedAt: REVIEWED_AT,
  reviewedByUserId: "operator-1",
  status: "APPROVED",
  teamId: TEAM_ID,
  updatedAt: REVIEWED_AT,
} satisfies TeamRegistrationReview;

const changeRequestedReview = {
  ...approvedReview,
  advisorIssueCodes: ["IDENTITY_DOCUMENT_UNREADABLE"],
  internalNotes: "Advisor and participant 2 documents need attention",
  participant2IssueCodes: ["ACADEMIC_RECORD_MISSING"],
  status: "CHANGES_REQUESTED",
} satisfies TeamRegistrationReview;

type TestTeamRegistrationReviewRepository = Omit<
  TeamRegistrationReviewRepository,
  "list" | "saveSubject"
> &
  Partial<Pick<TeamRegistrationReviewRepository, "list" | "saveSubject">>;

function createRouter(repository: TestTeamRegistrationReviewRepository, auth: AuthReader) {
  const list =
    repository.list ?? (async () => await Promise.resolve({ offset: 0, records: [], total: 0 }));
  const saveSubject = repository.saveSubject ?? (async () => await Promise.resolve(null));
  return createAppRouter({
    auth,
    teamRegistrationReviews: { ...repository, list, saveSubject },
  }).teamRegistrationReviews;
}

describe("team registration reviews router", () => {
  it("shows a Team Owner only per-subject Review Feedback for their Team", async () => {
    const findByTeamId = vi.fn<TeamRegistrationReviewRepository["findByTeamId"]>(async (access) => {
      expect(access).toStrictEqual({ actorId: "user-1", scope: "OWN_TEAM" });
      return await Promise.resolve({ review: changeRequestedReview, teamId: TEAM_ID });
    });
    const router = createRouter(
      {
        findByTeamId,
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.feedback,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationReviews", "feedback"] },
      ),
    ).resolves.toStrictEqual({
      advisor: "CHANGES_REQUESTED",
      participant1: "APPROVED",
      participant2: "CHANGES_REQUESTED",
      participant3: "APPROVED",
      status: "CHANGES_REQUESTED",
      statusUpdatedAt: REVIEWED_AT,
    });
    expect(log.audit).not.toHaveBeenCalled();
  });

  it("shows every subject as pending before the Team has a review", async () => {
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve({ review: null, teamId: TEAM_ID }),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.feedback,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationReviews", "feedback"] },
      ),
    ).resolves.toStrictEqual({
      advisor: "PENDING_REVIEW",
      participant1: "PENDING_REVIEW",
      participant2: "PENDING_REVIEW",
      participant3: "PENDING_REVIEW",
      status: "PENDING_REVIEW",
      statusUpdatedAt: null,
    });
  });

  it("shows every subject as approved when the whole review is approved", async () => {
    const router = createRouter(
      {
        findByTeamId: async () =>
          await Promise.resolve({
            review: {
              ...approvedReview,
              advisorIssueCodes: ["STALE_ISSUE_MUST_NOT_LEAK"],
              participant1IssueCodes: ["STALE_ISSUE_MUST_NOT_LEAK"],
              participant2IssueCodes: ["STALE_ISSUE_MUST_NOT_LEAK"],
              participant3IssueCodes: ["STALE_ISSUE_MUST_NOT_LEAK"],
            },
            teamId: TEAM_ID,
          }),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.feedback,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationReviews", "feedback"] },
      ),
    ).resolves.toStrictEqual({
      advisor: "APPROVED",
      participant1: "APPROVED",
      participant2: "APPROVED",
      participant3: "APPROVED",
      status: "APPROVED",
      statusUpdatedAt: REVIEWED_AT,
    });
  });

  it("reports subjects without an individual decision as pending review", async () => {
    const router = createRouter(
      {
        findByTeamId: async () =>
          await Promise.resolve({
            review: { ...approvedReview, participant1ReviewedAt: REVIEWED_AT },
            teamId: TEAM_ID,
          }),
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.feedback,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationReviews", "feedback"] },
      ),
    ).resolves.toStrictEqual({
      advisor: "PENDING_REVIEW",
      participant1: "APPROVED",
      participant2: "PENDING_REVIEW",
      participant3: "PENDING_REVIEW",
      status: "APPROVED",
      statusUpdatedAt: REVIEWED_AT,
    });
  });

  it("filters the review queue by the overall review decision", async () => {
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        list: async (input) => {
          expect(input).toStrictEqual({
            limit: 20,
            offset: 0,
            reviewStatus: "APPROVED",
            search: "",
            sortBy: "name",
            sortDesc: false,
          });
          return await Promise.resolve({ offset: 0, records: [], total: 0 });
        },
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(createTestSession({ user: { role: "registrationStaff" } })),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.list,
        { reviewStatus: "APPROVED", search: "" },
        { context, path: ["teamRegistrationReviews", "list"] },
      ),
    ).resolves.toStrictEqual({
      pagination: { nextOffset: null, offset: 0, total: 0 },
      rows: [],
    });
  });

  it("does not expose Review Feedback for a Team the owner does not own", async () => {
    const findByTeamId = vi.fn<TeamRegistrationReviewRepository["findByTeamId"]>(async (access) => {
      expect(access).toStrictEqual({ actorId: "user-1", scope: "OWN_TEAM" });
      return await Promise.resolve(null);
    });
    const router = createRouter(
      {
        findByTeamId,
        save: async () => await Promise.resolve(null),
      },
      createTestAuthReader(),
    );
    const { context } = createTestContext();

    await expect(
      call(
        router.feedback,
        { teamId: TEAM_ID },
        { context, path: ["teamRegistrationReviews", "feedback"] },
      ),
    ).rejects.toMatchObject({ code: "TEAM_NOT_FOUND", status: 404 });
  });

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

  it("saves a decision for only the selected registration subject", async () => {
    const saveSubject = vi.fn<NonNullable<TeamRegistrationReviewRepository["saveSubject"]>>(
      async (access, teamId, data) => {
        expect(access).toStrictEqual({ actorId: "operator-1", scope: "ALL_TEAMS" });
        expect(teamId).toBe(TEAM_ID);
        expect(data).toMatchObject({
          note: "Participant 2 must upload a clearer record.",
          reviewedByUserId: "operator-1",
          status: "CHANGES_REQUESTED",
          subject: "participant2",
        });
        return await Promise.resolve({ previous: approvedReview, review: changeRequestedReview });
      },
    );
    const router = createRouter(
      {
        findByTeamId: async () => await Promise.resolve(null),
        save: async () => await Promise.resolve(null),
        saveSubject,
      },
      createTestAuthReader(
        createTestSession({ user: { id: "operator-1", role: "registrationStaff" } }),
      ),
    );
    const { context, log } = createTestContext();

    await expect(
      call(
        router.saveSubject,
        {
          data: {
            note: "Participant 2 must upload a clearer record.",
            status: "CHANGES_REQUESTED",
            subject: "participant2",
          },
          teamId: TEAM_ID,
        },
        { context, path: ["teamRegistrationReviews", "saveSubject"] },
      ),
    ).resolves.toStrictEqual(changeRequestedReview);
    expect(log.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "team-registration-review.changed", outcome: "success" }),
    );
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
