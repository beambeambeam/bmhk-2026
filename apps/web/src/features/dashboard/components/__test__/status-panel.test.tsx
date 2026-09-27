// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StatusPanel from "../status-panel";

describe("document correction contact", () => {
  afterEach(cleanup);

  it("offers an email draft and a visible address for document corrections without Gmail login", () => {
    render(<StatusPanel status="issue" members={[]} team={{ code: "ABC123", name: "ทีม & One" }} />);

    const link = screen.getByRole("link", { name: "ติดต่อทีมงานเพื่อแก้ไข" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(`${url.protocol}${url.pathname}`).toBe("mailto:bangmodhack.team@gmail.com");
    expect(url.searchParams.get("subject")).toBe("ติดต่อแก้ไขข้อมูลเอกสาร ทีม ทีม & One");
    expect(url.searchParams.get("body")).toContain("ชื่อทีม : ทีม & One\nรหัสทีม : ABC123\n");
    expect(screen.getByText("bangmodhack.team@gmail.com")).toBeDefined();
    expect(link.getAttribute("target")).toBeNull();
  });

  it("calls onOpenDiscordModal when clicking join button on discord card", () => {
    const handleOpenDiscord = vi.fn<() => void>();
    render(
      <StatusPanel
        status="qualified"
        showDiscord={true}
        members={[]}
        team={{ code: "ABC123", name: "ทีม & One" }}
        onOpenDiscordModal={() => {
          handleOpenDiscord();
        }}
      />,
    );

    const button = screen.getByRole("button", { name: "รับรหัสเข้าร่วม" });
    fireEvent.click(button);
    expect(handleOpenDiscord).toHaveBeenCalledOnce();
  });

  it("renders round 2 confirmation step and action card when open and unconfirmed", () => {
    const handleOpenRound2 = vi.fn<() => void>();
    render(
      <StatusPanel
        status="semifinal-pending"
        members={[]}
        team={{ award: "ADVANCED_TO_ROUND_2", code: "ABC123", name: "ทีม A" }}
        round2Confirmation={{
          confirmedAt: null,
          isOpen: true,
          state: "DRAFT",
        }}
        onOpenRound2Modal={handleOpenRound2}
      />,
    );

    expect(screen.getByText("ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ")).toBeDefined();
    expect(screen.getByText("รอยืนยันสิทธิ์")).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: "ยืนยันสิทธิ์" });
    fireEvent.click(confirmBtn);
    expect(handleOpenRound2).toHaveBeenCalledOnce();
  });

  it("renders round 2 confirmation step and view document card when confirmed", () => {
    const handleOpenRound2 = vi.fn<() => void>();
    render(
      <StatusPanel
        status="semifinal-pending"
        members={[]}
        team={{ award: "ADVANCED_TO_ROUND_2", code: "ABC123", name: "ทีม A" }}
        round2Confirmation={{
          confirmedAt: new Date("2026-10-05T12:00:00Z"),
          isOpen: true,
          state: "CONFIRMED",
        }}
        onOpenRound2Modal={handleOpenRound2}
      />,
    );

    expect(screen.getByText("ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ")).toBeDefined();
    expect(screen.getByText("ยืนยันสิทธิ์สำเร็จ")).toBeDefined();

    const viewBtn = screen.getByRole("button", { name: "ดูเอกสาร" });
    fireEvent.click(viewBtn);
    expect(handleOpenRound2).toHaveBeenCalledOnce();
  });

  it("renders forfeited step when round 2 confirmation window is closed without confirmation", () => {
    render(
      <StatusPanel
        status="semifinal-pending"
        members={[]}
        team={{ award: "ADVANCED_TO_ROUND_2", code: "ABC123", name: "ทีม A" }}
        round2Confirmation={{
          confirmedAt: null,
          isOpen: false,
          state: "DRAFT",
        }}
      />,
    );

    expect(screen.getByText("ยืนยันสิทธิ์การเข้าแข่งขันรอบรองชนะเลิศ")).toBeDefined();
    expect(screen.getAllByText("สละสิทธิ์การแข่งขัน").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "ยืนยันสิทธิ์" })).toBeNull();
  });
});
