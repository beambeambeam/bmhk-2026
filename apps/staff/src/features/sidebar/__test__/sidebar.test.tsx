// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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

describe("staff sidebar permissions", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows staff check-in links to staff without registration links", () => {
    renderSidebar("staff");

    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน (รอบที่ 2)" })).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: /ตรวจสอบผู้สมัคร|ลงทะเบียนผู้เข้าร่วม|ผลงานการแข่งขัน/u }),
    ).toBeNull();
  });

  it("shows registration and staff check-in links to registration staff", () => {
    renderSidebar("registrationStaff");

    expect(screen.getByRole("link", { name: "ตรวจสอบผู้สมัครเข้าแข่งขัน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนผู้เข้าร่วม" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน (รอบที่ 2)" })).toBeTruthy();
  });

  it("shows academic staff the dashboard and staff check-in without registration or user admin links", () => {
    renderSidebar("academicStaff");

    expect(screen.getByRole("link", { name: "แดชบอร์ด" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ลงทะเบียนทีมงาน (รอบที่ 2)" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /ตรวจสอบผู้สมัคร|ลงทะเบียนผู้เข้าร่วม/u })).toBeNull();
    expect(screen.queryByRole("link", { name: "จัดการผู้ใช้ในระบบ" })).toBeNull();
  });

  it.each(["academicStaff", "admin", "superAdmin"])("shows round result links to %s", (role) => {
    renderSidebar(role);

    const resultLinks = screen.getAllByRole("link", { name: /ผลการแข่งขัน รอบที่/u });

    expect(resultLinks.map((link) => link.getAttribute("href"))).toStrictEqual([
      "/round1-results",
      "/round2-results",
      "/round3-results",
    ]);
  });

  it.each(["staff", "registrationStaff"])("hides round result links from %s", (role) => {
    renderSidebar(role);

    expect(screen.queryByRole("link", { name: /ผลการแข่งขัน รอบที่/u })).toBeNull();
  });
});
