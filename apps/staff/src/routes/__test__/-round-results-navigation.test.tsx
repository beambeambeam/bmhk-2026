// @vitest-environment jsdom

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "../../router";

const mocks = vi.hoisted(() => ({
  authClient: Object.assign(vi.fn<() => void>(), {
    getSession: vi.fn<() => Promise<unknown>>(),
  }),
}));

vi.mock(import("@bmhk-2026/client/auth-client"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authClient: new Proxy(actual.authClient, {
      get: (target, property, receiver) => {
        if (property === "getSession") {
          return mocks.authClient.getSession;
        }
        const value: unknown = Reflect.get(target, property, receiver);
        return value;
      },
    }),
  };
});
vi.mock(import("@tanstack/react-start/server"), () => ({ getRequestHeaders: () => new Headers() }));

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", mock);
  return mock;
});

const roundResultPaths = ["/round1-results", "/round2-results", "/round3-results"] as const;

function setSessionRole(role: string): void {
  mocks.authClient.getSession.mockResolvedValue({
    data: {
      user: {
        email: "person@kmutt.ac.th",
        id: "staff-user-id",
        name: "Staff Member",
        role,
      },
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundFromRequest(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.json) || typeof value.json.round !== "string") {
    throw new Error("Expected a round result list request");
  }

  return value.json.round;
}

function roundListResponse(round: string): Response {
  const isRoundOne = round === "ROUND_1";

  return Response.json({
    json: {
      rowCount: 1,
      rows: [
        {
          result: null,
          round,
          team: {
            id: isRoundOne
              ? "11111111-1111-4111-8111-111111111111"
              : "22222222-2222-4222-8222-222222222222",
            index: isRoundOne ? 1 : 2,
            name: isRoundOne ? "Round One Team" : "Round Two Team",
          },
        },
      ],
    },
  });
}

function stubMatchMedia(): void {
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
}

describe("round result route navigation", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mocks.authClient.getSession.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(roundResultPaths)("lets academic staff open %s directly", async (path) => {
    setSessionRole("academicStaff");
    const router = getRouter();

    await router.navigate({ to: path });

    expect(router.state.location.pathname).toBe(path);
  });

  it.each(roundResultPaths)("redirects staff away from direct access to %s", async (path) => {
    setSessionRole("staff");
    const router = getRouter();

    await router.navigate({ to: path });

    expect(router.state.location.pathname).toBe("/round1-staff-check");
  });

  it("closes the current dialog and clears old rows when navigating to another round", async () => {
    setSessionRole("academicStaff");
    stubMatchMedia();

    const roundTwoResponse = Promise.withResolvers<Response>();
    const router = getRouter();
    fetchMock.mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      const requestBody: unknown = await request.json();
      const round = roundFromRequest(requestBody);

      if (round === "ROUND_2") {
        return await roundTwoResponse.promise;
      }

      return roundListResponse(round);
    });
    await router.navigate({ to: "/round1-results" });

    render(
      <QueryClientProvider client={router.options.context.queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    await screen.findByRole("row", { name: /Round One Team/u });
    fireEvent.click(screen.getByRole("button", { name: "กรอกผลคะแนนรอบที่ 1 ทีม Round One Team" }));
    await screen.findByRole("dialog", { name: "กรอกผลคะแนนรอบที่ 1" });

    await router.navigate({ to: "/round2-results" });

    await screen.findByRole("heading", { name: "ผลการแข่งขัน รอบที่ 2" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByRole("row", { name: /Round One Team/u })).toBeNull();
    });
    expect(screen.getByText("กำลังโหลดผลการแข่งขัน...")).toBeTruthy();

    roundTwoResponse.resolve(roundListResponse("ROUND_2"));

    await screen.findByRole("row", { name: /Round Two Team/u });
    expect(screen.queryByRole("row", { name: /Round One Team/u })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
