// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StatusPanel from "../status-panel";

describe("document correction contact", () => {
  afterEach(cleanup);

  it("offers an email draft and a visible address for document corrections without Gmail login", () => {
    render(
      <StatusPanel
        status="issue"
        discordConfirmationOpen={true}
        members={[]}
        team={{ code: "ABC123", name: "ทีม & One" }}
      />,
    );

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
        discordConfirmationOpen={true}
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

  it("disables Discord verification after the confirmation window closes", () => {
    const handleOpenDiscord = vi.fn<() => void>();
    render(
      <StatusPanel
        status="qualified"
        showDiscord={true}
        discordConfirmationOpen={false}
        members={[]}
        onOpenDiscordModal={handleOpenDiscord}
      />,
    );

    const button = screen.getByRole("button", { name: "รับรหัสเข้าร่วม" });
    expect(button).toHaveProperty("disabled", true);
    expect(screen.getByText("ปิดรับการยืนยันตัวตนผ่าน Discord แล้ว")).toBeDefined();
    fireEvent.click(button);
    expect(handleOpenDiscord).not.toHaveBeenCalled();
  });
});
