// @vitest-environment jsdom

import type { ParticipantCheckInListResult } from "@bmhk-2026/api";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParticipantCheckInTeamRow } from "../table/team-row";
import type { ParticipantCheckInTableMeta } from "../table/team-row";

function renderTeam(
  checkedIn: boolean,
  award?: ParticipantCheckInListResult["rows"][number]["award"],
) {
  const onUpdateTeamRegistration = vi
    .fn<ParticipantCheckInTableMeta["onUpdateTeamRegistration"]>()
    .mockResolvedValue(true);
  const meta: ParticipantCheckInTableMeta = {
    checkingInId: undefined,
    isSettingTeamAward: false,
    onCheckIn: vi.fn<ParticipantCheckInTableMeta["onCheckIn"]>().mockResolvedValue(),
    onSort: vi.fn<ParticipantCheckInTableMeta["onSort"]>(),
    onUpdateFlag: vi.fn<ParticipantCheckInTableMeta["onUpdateFlag"]>().mockResolvedValue(),
    onUpdateTeamRegistration,
    round: "ROUND_2",
    sortBy: "name",
    sortDesc: false,
    updatingFlagId: undefined,
    updatingTeamAwardId: undefined,
  };
  const team: ParticipantCheckInListResult["rows"][number] = {
    award: award ?? (checkedIn ? "ROUND_2_PARTICIPATED" : "ADVANCED_TO_ROUND_2"),
    id: "11111111-1111-4111-8111-111111111111",
    index: 1,
    members: [{ checkIn: null, email: "member@example.com", id: "member-1", name: "Member One" }],
    name: "Team One",
    teamCheckIn: checkedIn ? { checkedInAt: new Date(), checkedInByName: "Staff" } : null,
  };
  render(
    <table>
      <ParticipantCheckInTeamRow meta={meta} team={team} />
    </table>,
  );
  fireEvent.click(screen.getByRole("button", { name: "แสดงสมาชิกทีม Team One" }));
  return { onUpdateTeamRegistration, team };
}

describe("round two team check-in", () => {
  afterEach(cleanup);

  it("shows the team check-in action and disables member check-in until the team registers", () => {
    const { onUpdateTeamRegistration, team } = renderTeam(false);
    expect(screen.getByText("ยังไม่ลงทะเบียนทีม")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "ลงทะเบียนเข้างาน" }).closest("fieldset")?.disabled,
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ลงทะเบียนทีมเข้าร่วมงาน" }));
    expect(onUpdateTeamRegistration).toHaveBeenCalledWith(team.id, team.name, true);
  });

  it("keeps cancellation visible when a checked-in team has the semifinal award", async () => {
    const { onUpdateTeamRegistration, team } = renderTeam(true, "ADVANCED_TO_ROUND_2");
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    fireEvent.click(await screen.findByRole("button", { name: "ยืนยันการยกเลิก" }));
    expect(onUpdateTeamRegistration).toHaveBeenCalledWith(team.id, team.name, false);
  });

  it("enables member check-in and allows cancelling the round two registration", async () => {
    const { onUpdateTeamRegistration, team } = renderTeam(true);
    expect(
      screen.getByRole("button", { name: "ลงทะเบียนเข้างาน" }).closest("fieldset")?.disabled,
    ).toBeFalsy();
    expect(screen.getByText("เข้าร่วมรอบที่ 2")).toBeDefined();
    expect(screen.getByText("ยืนยันโดย Staff")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    fireEvent.click(await screen.findByRole("button", { name: "ยืนยันการยกเลิก" }));
    expect(onUpdateTeamRegistration).toHaveBeenCalledWith(team.id, team.name, false);
  });
});
