// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { orpc } from "@bmhk-2026/client/orpc";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { TeamRoundResultsTable } from "../team-round-results-table";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

describe("staff team round results table", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
  });

  afterAll(() => vi.unstubAllGlobals());

  it("shows a checked-in team without inventing result values", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        json: {
          rowCount: 1,
          rows: [
            {
              result: null,
              round: "ROUND_1",
              team: { id: "11111111-1111-4111-8111-111111111111", index: 42, name: "Empty Team" },
            },
          ],
        },
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_1" />
      </QueryClientProvider>,
    );

    const row = await screen.findByRole("row", { name: /BH042\/26.*Empty Team/u });
    expect(within(row).getAllByRole("cell", { name: "—" })).toHaveLength(6);
    expect(screen.getByRole("switch", { name: "แสดงทุกทีม" }).getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(screen.getAllByRole("columnheader")).toHaveLength(9);
    fireEvent.click(within(row).getByRole("button", { name: "กรอกผลคะแนนรอบที่ 1 ทีม Empty Team" }));
    await expect(screen.findByRole("dialog")).resolves.toBeDefined();
  });

  it("requests both searches together and sorts creation time in both directions", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(Response.json({ json: { rowCount: 0, rows: [] } }));
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_2" />
      </QueryClientProvider>,
    );
    await screen.findByText("ไม่พบทีม");
    fireEvent.change(screen.getByRole("searchbox", { name: "รหัสทีม" }), {
      target: { value: " BH042 " },
    });
    fireEvent.change(screen.getByRole("searchbox", { name: "ชื่อทีม" }), {
      target: { value: " Alpha " },
    });
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    await expect(requests[1].clone().json()).resolves.toMatchObject({
      json: {
        columnFilters: [
          { id: "teamCode", value: "BH042" },
          { id: "teamName", value: "Alpha" },
          { id: "teamCheckIn", value: "registered" },
        ],
        pagination: { pageIndex: 0, pageSize: 10 },
        round: "ROUND_2",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างเมื่อ" }));
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    await expect(requests[2].clone().json()).resolves.toMatchObject({
      json: { sorting: [{ desc: false, id: "createdAt" }] },
    });
    fireEvent.click(screen.getByRole("button", { name: "สร้างเมื่อ" }));
    await waitFor(() => {
      expect(requests).toHaveLength(4);
    });
    await expect(requests[3].clone().json()).resolves.toMatchObject({
      json: { sorting: [{ desc: true, id: "createdAt" }] },
    });
  });

  it("shows a load error and retries without claiming the list is empty", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    fetchMock.mockResolvedValueOnce(Response.json({ json: { rowCount: 0, rows: [] } }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_3" />
      </QueryClientProvider>,
    );
    await screen.findByText("ไม่สามารถโหลดผลการแข่งขันได้ กรุณาลองใหม่อีกครั้ง");
    expect(screen.queryByText("ไม่พบทีม")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    await expect(screen.findByText("ไม่พบทีม")).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("displays zero scores and Bangkok time without using the browser timezone", () => {
    const input = {
      columnFilters: [{ id: "teamCheckIn" as const, value: "registered" as const }],
      pagination: { pageIndex: 0, pageSize: 10 },
      round: "ROUND_1" as const,
      sorting: [{ desc: false, id: "teamCode" as const }],
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(
      [...orpc.teamRoundResults.list.queryKey({ input }), { userId: "academic-1" }],
      {
        rowCount: 1,
        rows: [
          {
            result: {
              completedAssignment: 0,
              createdAt: new Date("2026-09-25T00:00:00.000Z"),
              lastSubmittedAt: new Date("2026-09-25T03:30:00.000Z"),
              round: "ROUND_1",
              score: 0,
              teamId: "11111111-1111-4111-8111-111111111111",
              totalSubmission: 0,
              updatedAt: new Date("2026-09-25T04:00:00.000Z"),
            },
            round: "ROUND_1",
            team: { id: "11111111-1111-4111-8111-111111111111", index: 42, name: "Scored Team" },
          },
        ],
      },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_1" />
      </QueryClientProvider>,
    );
    const row = screen.getByRole("row", { name: /Scored Team/u });
    expect(within(row).getAllByRole("cell", { name: "0" })).toHaveLength(3);
    expect(within(row).getByRole("cell", { name: /10:30/u })).toBeDefined();
    expect(within(row).getByRole("cell", { name: /07:00/u })).toBeDefined();
    expect(within(row).getByRole("cell", { name: /11:00/u })).toBeDefined();
  });
  it.each([
    ["teamCode", "รหัสทีม", true],
    ["teamName", "ชื่อทีม", false],
    ["score", "คะแนน", false],
    ["totalSubmission", "จำนวนครั้งที่ส่ง", false],
    ["completedAssignment", "งานที่เสร็จแล้ว", false],
    ["lastSubmittedAt", "ส่งล่าสุด", false],
    ["createdAt", "สร้างเมื่อ", false],
    ["updatedAt", "แก้ไขล่าสุด", false],
  ])("sorts %s across all pages", async (id, label, desc) => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(Response.json({ json: { rowCount: 30, rows: [] } }));
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_1" />
      </QueryClientProvider>,
    );
    await screen.findByText("ไม่พบทีม");
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    await expect(requests[1].clone().json()).resolves.toMatchObject({
      json: { pagination: { pageIndex: 1, pageSize: 10 } },
    });
    fireEvent.click(screen.getByRole("button", { name: label }));
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    await expect(requests[2].clone().json()).resolves.toMatchObject({
      json: { pagination: { pageIndex: 0, pageSize: 10 }, sorting: [{ desc, id }] },
    });
  });

  it("resets pagination when showing all teams and changing filters", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(Response.json({ json: { rowCount: 30, rows: [] } }));
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_3" />
      </QueryClientProvider>,
    );
    await screen.findByText("ไม่พบทีม");
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    fireEvent.click(screen.getByRole("switch", { name: "แสดงทุกทีม" }));
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    await expect(requests[2].clone().json()).resolves.toMatchObject({
      json: { columnFilters: [], pagination: { pageIndex: 0, pageSize: 10 }, round: "ROUND_3" },
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "ไปหน้าถัดไป" }).hasAttribute("disabled"),
      ).toBeFalsy();
    });
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    await waitFor(() => {
      expect(requests).toHaveLength(4);
    });
    fireEvent.change(screen.getByRole("searchbox", { name: "ชื่อทีม" }), {
      target: { value: "Alpha" },
    });
    expect(requests).toHaveLength(4);
    await waitFor(() => {
      expect(requests).toHaveLength(5);
    });
    await expect(requests[4].clone().json()).resolves.toMatchObject({
      json: {
        columnFilters: [{ id: "teamName", value: "Alpha" }],
        pagination: { pageIndex: 0, pageSize: 10 },
      },
    });
  });
  it("returns to the first page when the page size changes", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(Response.json({ json: { rowCount: 100, rows: [] } }));
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TeamRoundResultsTable actorId="academic-1" round="ROUND_1" />
      </QueryClientProvider>,
    );
    await screen.findByText("ไม่พบทีม");
    fireEvent.click(screen.getByRole("button", { name: "ไปหน้าถัดไป" }));
    await waitFor(() => {
      expect(requests).toHaveLength(2);
    });
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "จำนวนแถวต่อหน้า" }).hasAttribute("disabled"),
      ).toBeFalsy();
    });
    fireEvent.click(screen.getByRole("combobox", { name: "จำนวนแถวต่อหน้า" }));
    await expect(screen.findByRole("option", { name: "100" })).resolves.toBeDefined();
    expect(screen.getByRole("option", { name: "50" })).toBeDefined();
    const option = screen.getByRole("option", { name: "25" });
    fireEvent.pointerDown(option, { pointerType: "mouse" });
    fireEvent.click(option);
    await waitFor(() => {
      expect(requests).toHaveLength(3);
    });
    await expect(requests[2].clone().json()).resolves.toMatchObject({
      json: { pagination: { pageIndex: 0, pageSize: 25 } },
    });
  });
});
