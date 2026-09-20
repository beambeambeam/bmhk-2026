// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ParticipationEligibility } from "../participation-eligibility";

describe("first-round eligibility", () => {
  afterEach(cleanup);

  it.each([
    ["มีสิทธิ์เข้าแข่งขันในรอบแรก", "REGISTRATION_COMPLETED"],
    ["ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก", "NOT_QUALIFIED"],
  ] as const)("confirms before saving %s", async (label, award) => {
    const onConfirm = vi.fn<(award: "REGISTRATION_COMPLETED" | "NOT_QUALIFIED") => void>();
    render(
      <ParticipationEligibility
        award="NO_ACHIEVEMENT"
        canEdit
        pending={false}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: label }));
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(award);
  });
  it("blocks further actions while confirmation is saving", () => {
    const onConfirm = vi.fn<(award: "REGISTRATION_COMPLETED" | "NOT_QUALIFIED") => void>();
    const { rerender } = render(
      <ParticipationEligibility
        award="NO_ACHIEVEMENT"
        canEdit
        pending={false}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "มีสิทธิ์เข้าแข่งขันในรอบแรก" }));
    rerender(
      <ParticipationEligibility award="NO_ACHIEVEMENT" canEdit pending onConfirm={onConfirm} />,
    );
    const confirm = screen.getByRole("button", { name: "กำลังบันทึก..." });
    expect(confirm.hasAttribute("disabled")).toBeTruthy();
    expect(screen.getByRole("button", { name: "ยกเลิก" }).hasAttribute("disabled")).toBeTruthy();
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables eligibility changes without permission", () => {
    const onConfirm = vi.fn<(award: "REGISTRATION_COMPLETED" | "NOT_QUALIFIED") => void>();
    render(
      <ParticipationEligibility
        award="NO_ACHIEVEMENT"
        canEdit={false}
        pending={false}
        onConfirm={onConfirm}
      />,
    );
    expect(
      screen.getByRole("button", { name: "มีสิทธิ์เข้าแข่งขันในรอบแรก" }).hasAttribute("disabled"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "ไม่มีสิทธิ์เข้าแข่งขันในรอบแรก" }).hasAttribute("disabled"),
    ).toBeTruthy();
  });
});
