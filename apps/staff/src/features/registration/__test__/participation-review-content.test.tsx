// @vitest-environment jsdom

import type { TeamDetails, TeamRegistrationReview } from "@bmhk-2026/api";
import { Dialog } from "@/components/dialog";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParticipationReviewContent } from "../participation-review-content";

const team: TeamDetails = {
  award: "NO_ACHIEVEMENT",
  createdAt: new Date("2026-01-01"),
  id: "11111111-1111-4111-8111-111111111111",
  image: null,
  index: 1,
  memberCount: 0,
  name: "Team One",
  registrationSubmittedAt: null,
  school: "Test School",
  updatedAt: new Date("2026-01-01"),
  userId: "owner-1",
};

const review: TeamRegistrationReview = {
  advisorIssueCodes: [],
  advisorNotes: null,
  advisorReviewedAt: null,
  createdAt: new Date("2026-01-01"),
  id: "review-1",
  internalNotes: null,
  participant1IssueCodes: [],
  participant1Notes: null,
  participant1ReviewedAt: null,
  participant2IssueCodes: [],
  participant2Notes: null,
  participant2ReviewedAt: null,
  participant3IssueCodes: [],
  participant3Notes: null,
  participant3ReviewedAt: null,
  reviewedAt: new Date("2026-01-01"),
  reviewedByUserId: "staff-1",
  status: "APPROVED",
  teamId: team.id,
  updatedAt: new Date("2026-01-01"),
};

const changesRequestedReview: TeamRegistrationReview = {
  ...review,
  advisorIssueCodes: ["ข้อมูลไม่ตรง"],
  internalNotes: "กรุณาแก้ไขข้อมูล",
  status: "CHANGES_REQUESTED",
};

describe("participation review", () => {
  afterEach(cleanup);

  it("allows an approved review to request changes again", () => {
    const onSave = vi.fn<() => void>();
    render(
      <Dialog open>
        <ParticipationReviewContent
          schoolTeams={[]}
          schoolTeamsError={false}
          schoolTeamsLoading={false}
          advisor={undefined}
          canReview
          consent={undefined}
          hasDetailsError={false}
          isLoading={false}
          lastUpdatedAt={null}
          review={review}
          participants={[]}
          reviewedByName={null}
          savePending={false}
          team={team}
          teamId={team.id}
          onSave={onSave}
        />
      </Dialog>,
    );
    const approve = screen.getByRole("button", { name: "อนุมัติ" });
    const requestChanges = screen.getByRole("button", {
      name: "ยกเลิกอนุมัติและขอให้แก้ไข",
    });
    expect(approve.hasAttribute("disabled")).toBeTruthy();
    expect(requestChanges.hasAttribute("disabled")).toBeFalsy();
  });

  it("keeps both footer actions enabled while a review is pending", () => {
    const onSave = vi.fn<() => void>();
    render(
      <Dialog open>
        <ParticipationReviewContent
          schoolTeams={[]}
          schoolTeamsError={false}
          schoolTeamsLoading={false}
          advisor={undefined}
          canReview
          consent={undefined}
          hasDetailsError={false}
          isLoading={false}
          lastUpdatedAt={null}
          review={{ ...review, status: "PENDING_REVIEW" }}
          participants={[]}
          reviewedByName={null}
          savePending={false}
          team={team}
          teamId={team.id}
          onSave={onSave}
        />
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "อนุมัติ" }).hasAttribute("disabled")).toBeFalsy();
    expect(screen.getByRole("button", { name: "ขอให้แก้ไข" }).hasAttribute("disabled")).toBeFalsy();
  });

  it("keeps both footer actions enabled when changes were requested", () => {
    const onSave = vi.fn<() => void>();
    render(
      <Dialog open>
        <ParticipationReviewContent
          schoolTeams={[]}
          schoolTeamsError={false}
          schoolTeamsLoading={false}
          advisor={undefined}
          canReview
          consent={undefined}
          hasDetailsError={false}
          isLoading={false}
          lastUpdatedAt={null}
          review={changesRequestedReview}
          participants={[]}
          reviewedByName={null}
          savePending={false}
          team={team}
          teamId={team.id}
          onSave={onSave}
        />
      </Dialog>,
    );

    expect(screen.getByRole("button", { name: "อนุมัติ" }).hasAttribute("disabled")).toBeFalsy();
    expect(screen.getByRole("button", { name: "ขอให้แก้ไข" }).hasAttribute("disabled")).toBeFalsy();
  });
});
