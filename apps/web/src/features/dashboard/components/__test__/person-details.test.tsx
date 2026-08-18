// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getBaseMembers } from "../../team-data";
import PersonDetails from "../person-details";

describe("participant details", () => {
  it("shows Thai and English nicknames", () => {
    const participant = {
      ...getBaseMembers(2)[0],
      nicknameEn: "Mint",
      nicknameTh: "มิ้นท์",
    };

    render(<PersonDetails person={participant} />);

    expect(screen.getByText("ชื่อเล่น")).toBeDefined();
    expect(screen.getByText("มิ้นท์")).toBeDefined();
    expect(screen.getByText("Nickname")).toBeDefined();
    expect(screen.getByText("Mint")).toBeDefined();
  });
});
