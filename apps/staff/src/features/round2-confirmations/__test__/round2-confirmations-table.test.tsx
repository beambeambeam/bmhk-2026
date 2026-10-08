// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { Round2ConfirmationsTable } from "../round2-confirmations-table";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

describe("staff round 2 confirmations table", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
  });

  afterAll(() => vi.unstubAllGlobals());

  it("shows team confirmation and document counts without an action column", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        json: {
          rowCount: 1,
          rows: [
            {
              confirmedAt: null,
              participants: [
                {
                  hasIdentityDocument: true,
                  hasStudentIdDocument: true,
                  id: "22222222-2222-4222-8222-222222222221",
                  index: 1,
                  name: "สมชาย ใจดี",
                },
                {
                  hasIdentityDocument: true,
                  hasStudentIdDocument: false,
                  id: "22222222-2222-4222-8222-222222222222",
                  index: 2,
                  name: "สมหญิง รักเรียน",
                },
              ],
              state: "DRAFT",
              team: {
                award: "ADVANCED_TO_ROUND_2",
                id: "11111111-1111-4111-8111-111111111111",
                index: 42,
                memberCount: 2,
                name: "Team Example",
              },
            },
          ],
        },
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <Round2ConfirmationsTable actorId="registration-staff-1" />
      </QueryClientProvider>,
    );

    const row = await screen.findByRole("row", { name: /BH042\/26.*Team Example/u });
    expect(within(row).getByText("สมชาย ใจดี")).toBeDefined();
    expect(within(row).getByText("สมหญิง รักเรียน")).toBeDefined();
    expect(within(row).getByRole("cell", { name: "3 / 4" })).toBeDefined();
    expect(within(row).getByRole("cell", { name: "ยังไม่ยืนยัน" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "จัดการ" })).toBeNull();
  });
});
