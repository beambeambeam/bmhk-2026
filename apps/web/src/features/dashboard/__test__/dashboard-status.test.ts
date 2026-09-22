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
      { award: "NOT_QUALIFIED" },
      announced,
    );

    expect(status).toBe("selection-failed");
    expect(getAutoOpenedModal(status, announced)).toBe("selection-failed");
    expect(getAutoOpenedModal("rejected", announced)).toBe("rejected");
  });

  it.each(["NOT_QUALIFIED", "REGISTRATION_COMPLETED"])(
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
      { award: "REGISTRATION_COMPLETED" },
      announced,
    );

    expect(status).toBe("qualified");
    expect(getAutoOpenedModal(status, announced)).toBe("qualified");
  });

  it("announces a qualified team and preserves later round results", () => {
    const team = { award: "ROUND_1_COMPLETED" };
    const review = { status: "APPROVED" };
    const status = getDashboardStatus(review, team, announced);

    expect(status).toBe("qualified");
    expect(getAutoOpenedModal(status, announced)).toBe("qualified");
    expect(getDashboardStatus(review, team, { ...announced, qualifyingRound: true })).toBe(
      "semifinal-pending",
    );
    expect(
      getDashboardStatus(review, team, { ...announced, qualifyingResultsAnnouncement: true }),
    ).toBe("semifinal-failed");
    expect(
      getDashboardStatus(
        review,
        { award: "ROUND_2_COMPLETED" },
        {
          ...announced,
          qualifyingResultsAnnouncement: true,
        },
      ),
    ).toBe("semifinal-qualified");
  });
});
