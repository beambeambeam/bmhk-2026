import { describe, expect, it } from "vitest";

import { participantNicknameOf } from "../participant-nickname";

describe(participantNicknameOf, () => {
  it("formats the nickname as zero-padded index-team name-Thai first name", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "นรินทร์",
      teamIndex: 1,
      teamName: "Team Alpha",
      wasAlt: false,
    });

    expect(nickname).toBe("001-Team Alpha-นรินทร์");
  });

  it("caps the team name at 17 characters", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "นรินทร์",
      teamIndex: 2,
      teamName: "A Very Long Team Name That Exceeds The Limit",
      wasAlt: false,
    });

    expect(nickname).toBe("002-A Very Long Team -นรินทร์");
  });

  it("appends [A] for an alt-account redemption", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "นรินทร์",
      teamIndex: 1,
      teamName: "Team Alpha",
      wasAlt: true,
    });

    expect(nickname).toBe("001-Team Alpha-นรินทร์ [A]");
  });

  it("truncates the first name so the nickname fits 32 characters", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "สมชายนามยาวมาก",
      teamIndex: 7,
      teamName: "aaaaaaaaaaaaaaaaa",
      wasAlt: false,
    });

    expect(nickname).toBe("007-aaaaaaaaaaaaaaaaa-สมชายนามยา");
  });
});
