// @vitest-environment jsdom

import type { CheckInRound, TeamRoundResultOutcome, TeamRoundResultTeam } from "@bmhk-2026/api";
import { orpc } from "@bmhk-2026/client/orpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { TeamRoundResultOutcomeDialog } from "../team-round-result-outcome-dialog";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});
const requestLog: Request[] = [];
interface OutcomeResponseState {
  current: TeamRoundResultOutcome;
  failedOutcomeLoads: number;
  failedMutations: number;
  pendingMutationResponse?: Promise<Response>;
}

const TEAM: TeamRoundResultTeam = {
  id: "11111111-1111-4111-8111-111111111111",
  index: 42,
  name: "Team One",
};

function makeOutcome(
  round: CheckInRound,
  award: TeamRoundResultOutcome["award"],
  actionOverrides: Partial<TeamRoundResultOutcome["actions"]> = {},
): TeamRoundResultOutcome {
  return {
    actions: {
      canAdvance: round !== "ROUND_3",
      canRemoveFinalAward: false,
      canRevert: false,
      canSetFinalAward: round === "ROUND_3",
      hasLaterRoundCheckIns: false,
      ...actionOverrides,
    },
    award,
    round,
    team: TEAM,
  };
}

function renderOutcomeDialog(
  round: CheckInRound,
  outcome: TeamRoundResultOutcome,
  responseState?: OutcomeResponseState,
): QueryClient {
  const state = responseState ?? {
    current: outcome,
    failedMutations: 0,
    failedOutcomeLoads: 0,
  };
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  function DialogHarness() {
    const [open, setOpen] = useState(true);
    const focusRef = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={focusRef} type="button">
          Open outcome dialog
        </button>
        <TeamRoundResultOutcomeDialog
          finalFocusRef={focusRef}
          onOpenChange={setOpen}
          open={open}
          round={round}
          team={TEAM}
        />
      </>
    );
  }

  fetchMock.mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    requestLog.push(request);
    const rpcPath = new URL(request.url).pathname;
    if (rpcPath.endsWith("getOutcome") && state.failedOutcomeLoads > 0) {
      state.failedOutcomeLoads -= 1;
      return new Response(null, { status: 503 });
    }
    if (isSetOutcomeRequest(request) && state.pendingMutationResponse !== undefined) {
      return await state.pendingMutationResponse;
    }
    if (isSetOutcomeRequest(request) && state.failedMutations > 0) {
      state.failedMutations -= 1;
      return new Response(null, { status: 409 });
    }

    return Response.json({ json: state.current });
  });
  render(
    <QueryClientProvider client={queryClient}>
      <DialogHarness />
    </QueryClientProvider>,
  );
  return queryClient;
}

async function getOutcomeMutationRequest(): Promise<Record<string, unknown>> {
  const request = requestLog.find(isSetOutcomeRequest);
  if (request === undefined) {
    throw new Error("Expected a set outcome request");
  }

  const payload: unknown = await request.json();
  if (typeof payload !== "object" || payload === null || !("json" in payload)) {
    throw new Error("Expected an oRPC JSON request envelope");
  }

  const json: unknown = payload.json;
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new Error("Expected a set outcome input");
  }

  return Object.fromEntries(Object.entries(json));
}

function isSetOutcomeRequest(request: Request): boolean {
  return new URL(request.url).pathname.endsWith("setOutcome");
}

describe("team round result outcome dialog", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
    requestLog.length = 0;
  });

  afterAll(() => vi.unstubAllGlobals());

  it("closes without changing team outcome or score", async () => {
    const outcome = makeOutcome("ROUND_1", "ROUND_1_PARTICIPATED");
    renderOutcomeDialog("ROUND_1", outcome);

    await screen.findByText("เข้าร่วมรอบออนไลน์");
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("สถานะปัจจุบัน: เข้าร่วมรอบออนไลน์");
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("grants next-round eligibility without requiring a saved score", async () => {
    renderOutcomeDialog("ROUND_1", makeOutcome("ROUND_1", "ROUND_1_PARTICIPATED"));
    await screen.findByText("เข้าร่วมรอบออนไลน์");
    fireEvent.click(await screen.findByRole("button", { name: "มีสิทธิ์" }));

    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { type: "ADVANCE" },
      expectedAward: "ROUND_1_PARTICIPATED",
      round: "ROUND_1",
      teamId: TEAM.id,
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("confirms a safe eligibility reversal", async () => {
    renderOutcomeDialog(
      "ROUND_2",
      makeOutcome("ROUND_2", "ADVANCED_TO_ROUND_3", { canRevert: true }),
    );
    await screen.findByText("ผ่านเข้าสู่รอบชิงชนะเลิศ");
    fireEvent.click(await screen.findByRole("button", { name: "ยกเลิกสิทธิ์" }));
    await expect(
      screen.findByRole("alertdialog", { name: "ยืนยันการยกเลิกสิทธิ์" }),
    ).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));

    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { type: "REVERT" },
      expectedAward: "ADVANCED_TO_ROUND_3",
      round: "ROUND_2",
    });
  });

  it("explains why later check-ins block eligibility reversal", async () => {
    renderOutcomeDialog(
      "ROUND_2",
      makeOutcome("ROUND_2", "ADVANCED_TO_ROUND_3", {
        canRevert: false,
        hasLaterRoundCheckIns: true,
      }),
    );
    await screen.findByText("ผ่านเข้าสู่รอบชิงชนะเลิศ");
    await expect(
      screen.findByText("ทีมมีประวัติการเข้างานในรอบถัดไป จึงยกเลิกสิทธิ์ไม่ได้"),
    ).resolves.toBeDefined();
    expect(screen.getByRole("button", { name: "ยกเลิกสิทธิ์" }).hasAttribute("disabled")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("selects and saves a Thai-labeled final award", async () => {
    renderOutcomeDialog("ROUND_3", makeOutcome("ROUND_3", "ROUND_3_PARTICIPATED"));
    await screen.findByText("เข้าร่วมรอบชิงชนะเลิศ");
    fireEvent.click(await screen.findByRole("combobox", { name: "รางวัล" }));
    const secondPlace = await screen.findByRole("option", { name: "รางวัลอันดับที่ 2" });
    fireEvent.pointerDown(secondPlace, { pointerType: "mouse" });
    fireEvent.click(secondPlace);
    expect(screen.getByRole("combobox", { name: "รางวัล" }).textContent).toContain("รางวัลอันดับที่ 2");
    fireEvent.click(screen.getByRole("button", { name: "บันทึกรางวัล" }));

    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { award: "SECOND_PLACE", type: "SET_FINAL_AWARD" },
      expectedAward: "ROUND_3_PARTICIPATED",
      round: "ROUND_3",
    });
  });

  it("confirms replacement of an existing final award", async () => {
    renderOutcomeDialog(
      "ROUND_3",
      makeOutcome("ROUND_3", "FIRST_PLACE", { canRemoveFinalAward: true }),
    );
    const awardSelect = await screen.findByRole("combobox", { name: "รางวัล" });
    expect(awardSelect.textContent).toContain("รางวัลชนะเลิศ");
    fireEvent.click(awardSelect);
    const thirdPlace = await screen.findByRole("option", { name: "รางวัลอันดับที่ 3" });
    fireEvent.pointerDown(thirdPlace, { pointerType: "mouse" });
    fireEvent.click(thirdPlace);
    fireEvent.click(screen.getByRole("button", { name: "บันทึกรางวัล" }));
    await expect(
      screen.findByRole("alertdialog", { name: "ยืนยันการเปลี่ยนรางวัล" }),
    ).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { award: "THIRD_PLACE", type: "SET_FINAL_AWARD" },
      expectedAward: "FIRST_PLACE",
    });
  });

  it("confirms removal of a final award", async () => {
    renderOutcomeDialog(
      "ROUND_3",
      makeOutcome("ROUND_3", "HONORABLE_MENTION", { canRemoveFinalAward: true }),
    );
    const removalSelect = await screen.findByRole("combobox", { name: "รางวัล" });
    expect(removalSelect.textContent).toContain("รางวัลชมเชย");
    fireEvent.click(await screen.findByRole("button", { name: "ยกเลิกรางวัล" }));
    await expect(
      screen.findByRole("alertdialog", { name: "ยืนยันการยกเลิกรางวัล" }),
    ).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { type: "REMOVE_FINAL_AWARD" },
      expectedAward: "HONORABLE_MENTION",
    });
  });

  it("keeps the confirmed expected award when a refetch changes the current award", async () => {
    const initialOutcome = makeOutcome("ROUND_3", "FIRST_PLACE", {
      canRemoveFinalAward: true,
    });
    const responseState: OutcomeResponseState = {
      current: initialOutcome,
      failedMutations: 1,
      failedOutcomeLoads: 0,
    };
    const queryClient = renderOutcomeDialog("ROUND_3", initialOutcome, responseState);
    const awardSelect = await screen.findByRole("combobox", { name: "รางวัล" });
    await waitFor(() => {
      expect(awardSelect.textContent).toContain("รางวัลชนะเลิศ");
    });
    fireEvent.click(awardSelect);
    const thirdPlace = await screen.findByRole("option", { name: "รางวัลอันดับที่ 3" });
    fireEvent.pointerDown(thirdPlace, { pointerType: "mouse" });
    fireEvent.click(thirdPlace);
    fireEvent.click(screen.getByRole("button", { name: "บันทึกรางวัล" }));
    await expect(
      screen.findByRole("alertdialog", { name: "ยืนยันการเปลี่ยนรางวัล" }),
    ).resolves.toBeDefined();

    responseState.current = makeOutcome("ROUND_3", "SECOND_PLACE", {
      canRemoveFinalAward: true,
    });
    const queryKey = orpc.teamRoundResults.getOutcome.queryKey({
      input: { round: "ROUND_3", teamId: TEAM.id },
    });
    await queryClient.refetchQueries({ queryKey });
    expect(queryClient.getQueryData<TeamRoundResultOutcome>(queryKey)?.award).toBe("SECOND_PLACE");

    fireEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    await waitFor(() => {
      expect(requestLog.some(isSetOutcomeRequest)).toBeTruthy();
    });
    await expect(getOutcomeMutationRequest()).resolves.toMatchObject({
      action: { award: "THIRD_PLACE", type: "SET_FINAL_AWARD" },
      expectedAward: "FIRST_PLACE",
    });
    await expect(screen.findByRole("alert")).resolves.toBeDefined();
    expect(screen.getByRole("alertdialog").textContent).toContain("รางวัลอันดับที่ 3");
  });

  it("retries outcome loading and a failed eligibility mutation", async () => {
    const responseState: OutcomeResponseState = {
      current: makeOutcome("ROUND_1", "ROUND_1_PARTICIPATED"),
      failedMutations: 1,
      failedOutcomeLoads: 1,
    };
    renderOutcomeDialog("ROUND_1", responseState.current, responseState);

    await expect(screen.findByText("ไม่สามารถโหลดสถานะทีมได้ กรุณาลองใหม่อีกครั้ง")).resolves.toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    await screen.findByText("เข้าร่วมรอบออนไลน์");

    fireEvent.click(screen.getByRole("button", { name: "มีสิทธิ์" }));
    await expect(screen.findByRole("alert")).resolves.toBeDefined();
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "มีสิทธิ์" }));

    await waitFor(() => {
      expect(requestLog.filter(isSetOutcomeRequest)).toHaveLength(2);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("blocks closing and duplicate decisions while an outcome mutation is pending", async () => {
    const outcome = makeOutcome("ROUND_1", "ROUND_1_PARTICIPATED");
    const pendingResponse = Promise.withResolvers<Response>();
    renderOutcomeDialog("ROUND_1", outcome, {
      current: outcome,
      failedMutations: 0,
      failedOutcomeLoads: 0,
      pendingMutationResponse: pendingResponse.promise,
    });

    await screen.findByText("เข้าร่วมรอบออนไลน์");
    fireEvent.click(screen.getByRole("button", { name: "มีสิทธิ์" }));
    await waitFor(() => {
      expect(requestLog.filter(isSetOutcomeRequest)).toHaveLength(1);
    });

    const closeButtons = screen.getAllByRole("button", { name: "ปิด" });
    expect(closeButtons[0]?.hasAttribute("disabled")).toBeTruthy();
    const iconCloseButton = closeButtons.at(-1);
    if (iconCloseButton !== undefined) {
      fireEvent.click(iconCloseButton);
    }
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(requestLog.filter(isSetOutcomeRequest)).toHaveLength(1);

    pendingResponse.resolve(Response.json({ json: outcome }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
