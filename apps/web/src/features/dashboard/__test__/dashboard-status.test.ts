import { describe, expect, it } from "vitest";

import { getAutoOpenedModal, getDashboardStatus } from "../dashboard-status";

const announced = { eligibleTeamsAnnouncement: true };

describe("dashboard selection results", () => {
  it.each([
    { before: "selection-pending", review: { status: "APPROVED" } },
    { before: "issue", review: { status: "CHANGES_REQUESTED" } },
    { before: "rejected", review: { status: "REJECTED" } },
    { before: "rejected", review: { status: "FAILED" } },
    { before: "reviewing", review: { status: "PENDING_REVIEW" } },
    { before: "reviewing", review: null },
    { before: "reviewing", review: undefined },
  ])(
    "announces selection failure for $review while preserving the earlier $before state",
    ({ review, before }) => {
      const team = { award: "NO_ACHIEVEMENT" };
      const flags = { eligibleTeamsAnnouncement: false };
      const beforeStatus = getDashboardStatus(review, team, flags);
      const status = getDashboardStatus(review, team, announced);

      expect(beforeStatus).toBe(before);
      expect(getAutoOpenedModal(beforeStatus, flags)).toBeNull();
      expect(status).toBe("selection-failed");
      expect(getAutoOpenedModal(status, announced)).toBe("selection-failed");
    },
  );
  it("keeps an approved team pending while its award is unavailable", () => {
    const status = getDashboardStatus({ status: "APPROVED" }, {}, announced);

    expect(status).toBe("selection-pending");
    expect(getAutoOpenedModal(status, announced)).toBeNull();
  });
  it("distinguishes selection rejection from document rejection", () => {
    const status = getDashboardStatus(
      { status: "APPROVED" },
      { award: "REGISTRATION_FAILED" },
      announced,
    );

    expect(status).toBe("selection-failed");
    expect(getAutoOpenedModal(status, announced)).toBe("selection-failed");
    expect(getAutoOpenedModal("rejected", announced)).toBe("rejected");
  });

  it.each(["REGISTRATION_FAILED", "REGISTRATION_COMPLETE"])(
    "withholds the %s selection result before announcement",
    (award) => {
      const flags = { eligibleTeamsAnnouncement: false };
      const status = getDashboardStatus({ status: "APPROVED" }, { award }, flags);

      expect(status).toBe("selection-pending");
      expect(getAutoOpenedModal(status, flags)).toBeNull();
    },
  );

  it("announces registration completion as qualified for the first round", () => {
    const status = getDashboardStatus(
      { status: "APPROVED" },
      { award: "REGISTRATION_COMPLETE" },
      announced,
    );

    expect([status, getAutoOpenedModal(status, announced)]).toStrictEqual([
      "qualified",
      "qualified",
    ]);
  });

  it("announces a qualified team and preserves later round results", () => {
    const team = { award: "ADVANCED_TO_ROUND_2" };
    const review = { status: "APPROVED" };
    const status = getDashboardStatus(review, team, announced);

    expect([status, getAutoOpenedModal(status, announced)]).toStrictEqual([
      "qualified",
      "qualified",
    ]);
    expect(getDashboardStatus(review, team, { ...announced, qualifyingRound: true })).toBe(
      "qualified",
    );
    expect(
      getDashboardStatus(review, team, { ...announced, qualifyingResultsAnnouncement: true }),
    ).toBe("semifinal-pending");
    expect([
      getDashboardStatus(
        review,
        { award: "ROUND_1_PARTICIPATED" },
        { ...announced, qualifyingRound: true },
      ),
      getDashboardStatus(
        review,
        { award: "ROUND_1_PARTICIPATED" },
        { ...announced, qualifyingResultsAnnouncement: true },
      ),
    ]).toStrictEqual(["round1-pending", "round1-failed"]);
    expect([
      getDashboardStatus(
        review,
        { award: "ROUND_2_PARTICIPATED" },
        { ...announced, qualifyingResultsAnnouncement: true },
      ),
      getDashboardStatus(
        review,
        { award: "ADVANCED_TO_ROUND_3" },
        { ...announced, qualifyingResultsAnnouncement: true },
      ),
    ]).toStrictEqual(["semifinal-failed", "semifinal-qualified"]);
  });
});
