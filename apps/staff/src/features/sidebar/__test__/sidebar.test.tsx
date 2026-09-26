// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/tooltip";
import { SidebarProvider } from "@/components/sidebar";
import { StaffSidebar } from "../index";

// oxlint-disable-next-line vitest/prefer-import-in-mock -- The router's generic Link type conflicts with this small render fake.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => () => {},
}));

function renderSidebar(role: string) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn<() => void>(),
      addListener: vi.fn<() => void>(),
      matches: false,
      media: "",
      removeEventListener: vi.fn<() => void>(),
      removeListener: vi.fn<() => void>(),
    })),
  );

  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <SidebarProvider>
            <StaffSidebar role={role} />
          </SidebarProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function getRoundResultLinksByGroup(): (string | null)[] {
  return [1, 2, 3].map((round) => {
    const groupLabel = screen.getByText(`การแข่งขัน รอบที่ ${round}`);
    const group = groupLabel.parentElement;
    return group
      ? (within(group)
          .queryByRole("link", { name: `ผลการแข่งขัน รอบที่ ${round}` })
          ?.getAttribute("href") ?? null)
      : null;
  });
}

describe("staff sidebar permissions", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows participant check-in links to staff without registration or staff check-in links", () => {
    renderSidebar("staff");

    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม (รอบที่ 2)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม (รอบที่ 3)" })).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /ตรวจสอบผู้สมัคร|ลงทะเบียนทีมงาน|ผลงานการแข่งขัน/u }),
    ).toBeNull();
  });

  it("shows registration, participant and staff check-in links to registration staff", () => {
    renderSidebar("registrationStaff");

    expect(screen.getByRole("link", { name: "ตรวจสอบผู้สมัครเข้าแข่งขัน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน (รอบที่ 2)" })).toBeTruthy();
  });

  it("shows academic staff the dashboard and participant check-in without registration, staff check-in or user admin links", () => {
    renderSidebar("academicStaff");

    expect(screen.getByRole("link", { name: "แดชบอร์ด" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม (รอบที่ 2)" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /ตรวจสอบผู้สมัคร|ลงทะเบียนทีมงาน/u })).toBeNull();
    expect(screen.queryByRole("link", { name: "จัดการผู้ใช้ในระบบ" })).toBeNull();
  });

  it.each(["academicStaff", "registrationStaff", "admin", "superAdmin"])(
    "shows round result links in their round groups to %s",
    (role) => {
      renderSidebar(role);

      expect(getRoundResultLinksByGroup()).toStrictEqual([
        "/round1-results",
        "/round2-results",
        "/round3-results",
      ]);
    },
  );

  it("hides round result links from staff without academic access", () => {
    renderSidebar("staff");

    expect(screen.queryByRole("link", { name: /ผลการแข่งขัน รอบที่/u })).toBeNull();
  });
});
