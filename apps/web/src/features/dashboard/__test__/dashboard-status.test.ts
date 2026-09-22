import { describe, expect, it } from "vitest";

import { getAutoOpenedModal, getDashboardStatus } from "../dashboard-status";

const announced = { eligibleTeamsAnnouncement: true };

describe("dashboard selection results", () => {
  it.each(["NO_ACHIEVEMENT", "REGISTRATION_COMPLETED", undefined])(
    "keeps an approved team pending when its award is %s",
    (award) => {
      const status = getDashboardStatus({ status: "APPROVED" }, { award }, announced);

      expect(status).toBe("selection-pending");
      expect(getAutoOpenedModal(status, announced)).toBeNull();
    },
  );
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

  it.each(["NOT_QUALIFIED", "ROUND_1_COMPLETED"])(
    "withholds the %s selection result before announcement",
    (award) => {
      const flags = { eligibleTeamsAnnouncement: false };
      const status = getDashboardStatus({ status: "APPROVED" }, { award }, flags);

      expect(status).toBe("selection-pending");
      expect(getAutoOpenedModal(status, flags)).toBeNull();
    },
  );

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
