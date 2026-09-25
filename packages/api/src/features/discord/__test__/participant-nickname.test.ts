import { describe, expect, it } from "vitest";

import { participantNicknameOf } from "../participant-nickname";

describe(participantNicknameOf, () => {
  it("formats the nickname as zero-padded index-team name-Thai first name", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "นรินทร์",
      teamIndex: 1,
      teamName: "Team Alpha",
    });

    expect(nickname).toBe("001-Team Alpha-นรินทร์");
  });

  it("caps the team name at 17 characters", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "นรินทร์",
      teamIndex: 2,
      teamName: "A Very Long Team Name That Exceeds The Limit",
    });

    expect(nickname).toBe("002-A Very Long Team -นรินทร์");
  });

  it("truncates the first name so the nickname fits 32 characters", () => {
    const nickname = participantNicknameOf({
      firstNameTh: "สมชายนามยาวมาก",
      teamIndex: 7,
      teamName: "aaaaaaaaaaaaaaaaa",
    });

    expect(nickname).toBe("007-aaaaaaaaaaaaaaaaa-สมชายนามยา");
  });
});
