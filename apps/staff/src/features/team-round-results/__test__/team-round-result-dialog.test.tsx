// @vitest-environment jsdom

import type { TeamRoundResult, TeamRoundResultTeam } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { TeamRoundResultDialog } from "../team-round-result-dialog";
import {
  bangkokDateTimeInputToIso,
  dateToBangkokInputValue,
  formatBangkokDateTime,
} from "../round-result-datetime";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

const TEAM: TeamRoundResultTeam = {
  id: "11111111-1111-4111-8111-111111111111",
  index: 42,
  name: "Team One",
};
const ROUND = "ROUND_2" as const;

function makeResult(overrides: Partial<TeamRoundResult> = {}): TeamRoundResult {
  return {
    completedAssignment: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    lastSubmittedAt: null,
    round: ROUND,
    score: 0,
    teamId: TEAM.id,
    totalSubmission: 2,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function renderDialog(result: TeamRoundResult | null = null): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  queryClient.setQueryData(orpc.teamRoundResults.list.key(), { rows: [] });
  queryClient.setQueryData(orpc.teamRoundResults.get.key({ input: { teamId: TEAM.id } }), {
    rounds: [],
    team: TEAM,
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TeamRoundResultDialog result={result} round={ROUND} team={TEAM} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /ผล.*ทีม Team One/u }));
  return queryClient;
}

function successResponse(result: TeamRoundResult = makeResult()) {
  return Response.json({ json: result });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getSaveRequestBody(requests: Request[]): Promise<Record<string, unknown>> {
  const [request] = requests;
  if (request === undefined) {
    throw new Error("Expected a team round result save request");
  }

  const payload: unknown = await request.json();
  if (!isRecord(payload) || !isRecord(payload.json)) {
    throw new Error("Expected the oRPC JSON request envelope");
  }

  return payload.json;
}

function fillNewResult({
  score = "-2.5",
  totalSubmission = "0",
  completedAssignment = "1",
  lastSubmittedAt = "2026-08-01T12:30",
}: {
  score?: string;
  totalSubmission?: string;
  completedAssignment?: string;
  lastSubmittedAt?: string;
} = {}): void {
  fireEvent.change(screen.getByRole("textbox", { name: "คะแนน" }), {
    target: { value: score },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "จำนวนครั้งที่ส่ง" }), {
    target: { value: totalSubmission },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "จำนวนงานที่ทำสำเร็จ" }), {
    target: { value: completedAssignment },
  });
  fireEvent.change(screen.getByLabelText("ส่งงานล่าสุด"), {
    target: { value: lastSubmittedAt },
  });
}

describe("team round result dialog", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
  });

  afterAll(() => vi.unstubAllGlobals());

  it("starts a new result with blank inputs and identifies the team and round", () => {
    renderDialog();

    expect({
      dialog: screen.getByRole("dialog", { name: "กรอกผลคะแนนรอบที่ 2" }),
      fieldValues: [
        screen.getByRole<HTMLInputElement>("textbox", { name: "คะแนน" }).value,
        screen.getByRole<HTMLInputElement>("textbox", { name: "จำนวนครั้งที่ส่ง" }).value,
        screen.getByRole<HTMLInputElement>("textbox", { name: "จำนวนงานที่ทำสำเร็จ" }).value,
        screen.getByLabelText<HTMLInputElement>("ส่งงานล่าสุด").value,
      ],
      teamDescription: screen.getByText("ทีม Team One · BH042/26"),
      timezone: screen.getByText("เวลา Asia/Bangkok (UTC+7)"),
    }).toMatchObject({ fieldValues: ["", "", "", ""] });
  });

  it("shows saved zero values and preserves an unchanged timestamp to millisecond precision", async () => {
    const originalLastSubmittedAt = new Date("2026-01-02T04:05:59.876Z");
    const result = makeResult({
      completedAssignment: 0,
      lastSubmittedAt: originalLastSubmittedAt,
      score: 0,
      totalSubmission: 0,
    });
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(successResponse(result));
    });

    renderDialog(result);
    expect(screen.getByRole("dialog", { name: "แก้ไขผลคะแนนรอบที่ 2" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "คะแนน" }).getAttribute("value")).toBe("0");
    expect(screen.getByRole("textbox", { name: "จำนวนครั้งที่ส่ง" }).getAttribute("value")).toBe("0");
    expect(screen.getByLabelText("ส่งงานล่าสุด").getAttribute("value")).toBe("2026-01-02T11:05");

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    const body = await getSaveRequestBody(requests);
    expect(body).toMatchObject({
      completedAssignment: 0,
      lastSubmittedAt: originalLastSubmittedAt.toISOString(),
      round: ROUND,
      score: 0,
      teamId: TEAM.id,
      totalSubmission: 0,
    });
  });

  it("rejects non-integers, count bounds, and excess score precision before saving", async () => {
    const queryClient = renderDialog();
    fillNewResult({ completedAssignment: "1.5", score: "1.234", totalSubmission: "2147483648" });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));

    await expect(screen.findByText("กรอกคะแนนไม่เกิน 2 ตำแหน่งทศนิยม")).resolves.toBeTruthy();
    expect(screen.getAllByText("กรอกจำนวนเต็มตั้งแต่ 0 ถึง 2,147,483,647")).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it("requires both count fields even when score and submission time are blank", async () => {
    renderDialog();
    fillNewResult({ completedAssignment: "", lastSubmittedAt: "", score: "", totalSubmission: "" });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));

    await expect(screen.findAllByText("กรอกจำนวนเต็มตั้งแต่ 0 ถึง 2,147,483,647")).resolves.toHaveLength(
      2,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows staff to correct invalid fields and save the result", async () => {
    fetchMock.mockResolvedValue(successResponse());
    renderDialog();
    fillNewResult({ completedAssignment: "1.5", score: "1.234", totalSubmission: "2147483648" });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await screen.findByText("กรอกคะแนนไม่เกิน 2 ตำแหน่งทศนิยม");

    fillNewResult({ completedAssignment: "3", score: "1.25", totalSubmission: "2" });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("saves blank score and time as null and converts Bangkok time to an absolute instant", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(
        successResponse(makeResult({ lastSubmittedAt: null, score: null })),
      );
    });
    const queryClient = renderDialog();
    fillNewResult({ lastSubmittedAt: "", score: "" });

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(requests).toHaveLength(1);
    const body = await getSaveRequestBody(requests);
    expect(body).toMatchObject({
      completedAssignment: 1,
      lastSubmittedAt: null,
      round: ROUND,
      score: null,
      teamId: TEAM.id,
      totalSubmission: 0,
    });
    expect(body.lastSubmittedAt).toBeNull();
    expect(queryClient.getQueryState(orpc.teamRoundResults.list.key())?.isInvalidated).toBeTruthy();
    expect(
      queryClient.getQueryState(orpc.teamRoundResults.get.key({ input: { teamId: TEAM.id } }))
        ?.isInvalidated,
    ).toBeTruthy();
  });

  it("converts edited local time from Bangkok regardless of the browser time zone", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(
        successResponse(makeResult({ lastSubmittedAt: new Date("2026-08-01T05:30:00.000Z") })),
      );
    });
    renderDialog();
    fillNewResult();

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });

    const body = await getSaveRequestBody(requests);
    expect(body.lastSubmittedAt).toBe("2026-08-01T05:30:00.000Z");
  });

  it("retains entered values after a failed save and permits retry", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(successResponse());
    renderDialog();
    fillNewResult();

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await expect(screen.findByRole("alert")).resolves.toBeTruthy();
    expect(screen.getByRole("textbox", { name: "คะแนน" }).getAttribute("value")).toBe("-2.5");
    expect(screen.getByLabelText("ส่งงานล่าสุด").getAttribute("value")).toBe("2026-08-01T12:30");

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate saves and closing while a save is pending", async () => {
    const response = Promise.withResolvers<Response>();
    fetchMock.mockReturnValue(response.promise);
    renderDialog();
    fillNewResult();
    const saveButton = screen.getByRole("button", { name: "บันทึกผล" });

    fireEvent.click(saveButton);
    const pendingButton = await screen.findByRole("button", { name: "กำลังบันทึก..." });
    fireEvent.click(pendingButton);
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeTruthy();

    response.resolve(successResponse());
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});

describe("team round result Bangkok time helpers", () => {
  it("formats values in Bangkok and converts input values without local time zone dependence", () => {
    const timestamp = new Date("2026-01-02T04:05:59.876Z");

    expect(dateToBangkokInputValue(timestamp)).toBe("2026-01-02T11:05");
    expect(formatBangkokDateTime(timestamp)).toContain("11:05");
    expect(formatBangkokDateTime(null)).toBe("—");
    expect(bangkokDateTimeInputToIso("2026-08-01T12:30")).toBe("2026-08-01T05:30:00.000Z");
    expect(bangkokDateTimeInputToIso("")).toBeNull();
  });
});
