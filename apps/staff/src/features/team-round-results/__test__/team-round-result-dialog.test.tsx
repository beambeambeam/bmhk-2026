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
}: {
  score?: string;
  totalSubmission?: string;
  completedAssignment?: string;
} = {}): void {
  fireEvent.change(screen.getByRole("textbox", { name: "คะแนน" }), {
    target: { value: score },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "จำนวน submission" }), {
    target: { value: totalSubmission },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "จำนวน completed assignment" }), {
    target: { value: completedAssignment },
  });
}

function getTodayBangkokDate(): string {
  return "2026-09-25";
}

function useFixedBangkokTestDate(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T05:00:00.000Z"));
}

function getTodayCalendarLabelPattern(dateValue: string): RegExp {
  const date = new Date(`${dateValue}T05:00:00.000Z`);
  const day = Number(dateValue.slice(-2));
  const month = new Intl.DateTimeFormat("th-TH", {
    month: "long",
    timeZone: "Asia/Bangkok",
  }).format(date);
  return new RegExp(`${day}.*${month}`, "u");
}

async function chooseTodayAt(hour: string, minute: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "last submitted at" }));
  fireEvent.click(
    await screen.findByRole("button", {
      name: getTodayCalendarLabelPattern(getTodayBangkokDate()),
    }),
  );

  fireEvent.click(screen.getByRole("combobox", { name: "ชั่วโมง" }));
  const hourOption = await screen.findByRole("option", { name: hour });
  fireEvent.pointerDown(hourOption, { pointerType: "mouse" });
  fireEvent.click(hourOption);
  fireEvent.click(screen.getByRole("combobox", { name: "นาที" }));
  const minuteOption = await screen.findByRole("option", { name: minute });
  fireEvent.pointerDown(minuteOption, { pointerType: "mouse" });
  fireEvent.click(minuteOption);
}

describe("team round result dialog", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    vi.useRealTimers();
  });

  afterAll(() => vi.unstubAllGlobals());

  it("starts a new result with blank inputs and identifies the team and round", () => {
    renderDialog();

    expect({
      dialog: screen.getByRole("dialog", { name: "กรอกผลคะแนนรอบที่ 2" }),
      fieldValues: [
        screen.getByRole<HTMLInputElement>("textbox", { name: "คะแนน" }).value,
        screen.getByRole<HTMLInputElement>("textbox", { name: "จำนวน submission" }).value,
        screen.getByRole<HTMLInputElement>("textbox", { name: "จำนวน completed assignment" }).value,
      ],
      lastSubmittedAtIsBlank:
        screen
          .getByRole("button", { name: "last submitted at" })
          .textContent?.includes("เลือกวันที่และเวลา") ?? false,
      teamDescription: screen.getByText("ทีม Team One · BH042/26"),
    }).toMatchObject({
      fieldValues: ["", "", ""],
      lastSubmittedAtIsBlank: true,
    });
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
    expect(screen.getByRole("textbox", { name: "จำนวน submission" }).getAttribute("value")).toBe(
      "0",
    );
    expect(screen.getByRole("button", { name: "last submitted at" }).textContent).toContain(
      "11:05",
    );

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
    fillNewResult({ completedAssignment: "", score: "", totalSubmission: "" });

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
    fillNewResult({ score: "" });

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

  it("lets staff clear a saved date and time and sends null", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(successResponse(makeResult({ lastSubmittedAt: null })));
    });
    renderDialog(makeResult({ lastSubmittedAt: new Date("2026-08-01T05:30:00.000Z") }));
    fireEvent.click(screen.getByRole("button", { name: "last submitted at" }));
    fireEvent.click(screen.getByRole("button", { name: "ล้างวันที่และเวลา" }));
    expect(screen.getByRole("button", { name: "last submitted at" }).textContent).toContain(
      "เลือกวันที่และเวลา",
    );

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "แก้ไขผลคะแนนรอบที่ 2" })).toBeNull();
    });
    const body = await getSaveRequestBody(requests);
    expect(body.lastSubmittedAt).toBeNull();
  });

  it("converts edited local time from Bangkok regardless of the browser time zone", async () => {
    useFixedBangkokTestDate();
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(
        successResponse(makeResult({ lastSubmittedAt: new Date("2026-08-01T05:30:00.000Z") })),
      );
    });
    renderDialog();
    fillNewResult();
    await chooseTodayAt("12", "30");

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });

    const body = await getSaveRequestBody(requests);
    expect(body.lastSubmittedAt).toBe("2026-09-25T05:30:00.000Z");
  });

  it("retains entered values after a failed save and permits retry", async () => {
    useFixedBangkokTestDate();
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(successResponse());
    renderDialog();
    fillNewResult();
    await chooseTodayAt("12", "30");

    fireEvent.click(screen.getByRole("button", { name: "บันทึกผล" }));
    await expect(screen.findByRole("alert")).resolves.toBeTruthy();
    expect(screen.getByRole("textbox", { name: "คะแนน" }).getAttribute("value")).toBe("-2.5");
    expect(screen.getByRole("button", { name: "last submitted at" }).textContent).toContain(
      "12:30",
    );

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
