// @vitest-environment jsdom

import { orpc } from "@bmhk-2026/client/orpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ParticipationRemovalDialog } from "../participation-removal-dialog";

vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));
const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

const TEAM_ID = "11111111-1111-4111-8111-111111111111";

function renderRemoval(onClose: () => void): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  queryClient.setQueryData(orpc.teams.list.key(), { data: [{ id: TEAM_ID }] });
  queryClient.setQueryData(orpc.teamRegistrationReviews.list.key(), { rows: [{ id: TEAM_ID }] });
  render(
    <QueryClientProvider client={queryClient}>
      <ParticipationRemovalDialog teamId={TEAM_ID} teamName="Team One" onClose={onClose} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "พิมพ์ชื่อทีมเพื่อยืนยัน" }), {
    target: { value: "Team One" },
  });
  return queryClient;
}

describe("permanent team removal", () => {
  afterEach(() => {
    cleanup();
    fetchMock.mockReset();
  });

  afterAll(() => vi.unstubAllGlobals());

  it("deletes the selected team and refreshes lists after success", async () => {
    const requests: Request[] = [];
    fetchMock.mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      return await Promise.resolve(Response.json({ json: { id: TEAM_ID } }));
    });
    const onClose = vi.fn<() => void>();
    const queryClient = renderRemoval(onClose);
    fireEvent.click(screen.getByRole("button", { name: "ลบทีมถาวร" }));
    await waitFor(() => {
      expect(queryClient.getMutationCache().getAll()[0]?.state.error).toBeNull();
      expect(onClose).toHaveBeenCalledOnce();
    });
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toBe("/rpc/teams/delete");
    await expect(requests[0].json()).resolves.toStrictEqual({ json: { id: TEAM_ID } });
    expect(queryClient.getQueryState(orpc.teams.list.key())?.isInvalidated).toBeTruthy();
    expect(
      queryClient.getQueryState(orpc.teamRegistrationReviews.list.key())?.isInvalidated,
    ).toBeTruthy();
  });

  it("keeps the dialog open and allows retry when deletion fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const onClose = vi.fn<() => void>();
    renderRemoval(onClose);
    fireEvent.click(screen.getByRole("button", { name: "ลบทีมถาวร" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("ไม่สามารถลบทีมได้ กรุณาลองใหม่อีกครั้ง");
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "ลบทีมถาวร" }).disabled,
    ).toBeFalsy();
  });

  it("prevents another submission or cancellation while deletion is pending", async () => {
    const response = Promise.withResolvers<Response>();
    fetchMock.mockReturnValue(response.promise);
    const onClose = vi.fn<() => void>();
    renderRemoval(onClose);
    fireEvent.click(screen.getByRole("button", { name: "ลบทีมถาวร" }));
    const pending = await screen.findByRole<HTMLButtonElement>("button", { name: "กำลังลบทีม..." });
    expect(pending.disabled).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "ยกเลิก" }).disabled).toBeTruthy();
    fireEvent.click(pending);
    expect(fetchMock).toHaveBeenCalledOnce();
    response.resolve(Response.json({ json: { id: TEAM_ID } }));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
