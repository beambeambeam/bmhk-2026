// @vitest-environment jsdom

import { createElement } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MyTeam from "../my-team";

function createQueryEndpoint(key: string[], queryFn: () => Promise<unknown>) {
  return {
    queryKey: () => key,
    queryOptions: (options: Record<string, unknown> = {}) => ({
      ...options,
      queryFn: async () => await queryFn(),
      queryKey: key,
    }),
  };
}

const fakes = vi.hoisted(() => {
  const featureFlags = vi.fn<() => Promise<unknown>>();
  const status = vi.fn<() => Promise<unknown>>();
  const team = vi.fn<() => Promise<unknown>>();
  const review = vi.fn<() => Promise<unknown>>();
  const participants = vi.fn<() => Promise<unknown>>();
  const advisor = vi.fn<() => Promise<unknown>>();

  return {
    advisor,
    featureFlags,
    orpc: {
      featureFlags: { getAll: createQueryEndpoint(["featureFlags", "getAll"], featureFlags) },
      teamAdvisors: { get: createQueryEndpoint(["teamAdvisors", "get"], advisor) },
      teamParticipants: { list: createQueryEndpoint(["teamParticipants", "list"], participants) },
      teamRegistrationReviews: {
        feedback: createQueryEndpoint(["teamRegistrationReviews", "feedback"], review),
      },
      teamRegistrationStatus: {
        get: createQueryEndpoint(["teamRegistrationStatus", "get"], status),
      },
      teams: { get: createQueryEndpoint(["teams", "get"], team) },
    },
    participants,
    review,
    status,
    team,
  };
});

/* oxlint-disable vitest/prefer-import-in-mock -- These fakes cover the dashboard's public query boundary. */
vi.mock("@bmhk-2026/client/orpc", () => ({ orpc: fakes.orpc }));
vi.mock("@/components/account-menu", () => ({
  AuthTopBar: () => createElement("div"),
}));
vi.mock("@/components/loader", () => ({
  default: () => createElement("div", { "data-testid": "dashboard-loader" }),
}));
vi.mock("@/components/scroll-edge-effect", () => ({
  default: () => createElement("div"),
}));
vi.mock("../components/discord-codes-modal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? createElement("div", { "data-testid": "discord-codes-modal" }) : null,
}));
vi.mock("../components/person-details", () => ({
  default: () => createElement("div"),
}));
vi.mock("../components/result-modal", () => ({
  default: ({
    actions,
    lines,
    open,
    title,
  }: {
    actions?: ReactNode;
    lines: string[];
    open: boolean;
    title: string;
  }) =>
    open
      ? createElement(
          "div",
          {
            "data-testid": lines[0]?.includes("แสดงความยินดี")
              ? "result-modal-qualified"
              : "result-modal-other",
          },
          title,
          actions,
        )
      : null,
}));
vi.mock("../components/status-panel", () => ({
  DiscordGlyph: () => createElement("span"),
  default: ({ status }: { status: string }) =>
    createElement("div", { "data-testid": "dashboard-status" }, status),
}));
vi.mock("../components/team-decor", () => ({
  default: () => createElement("div"),
}));
/* oxlint-enable vitest/prefer-import-in-mock */

const beforeAnnouncement = {
  eligibleTeamsAnnouncement: false,
  finalRound: false,
  qualifyingResultsAnnouncement: false,
  qualifyingRound: false,
  qualifyingRoundIdentityConfirmation: false,
  registration: false,
};

const afterAnnouncement = {
  ...beforeAnnouncement,
  eligibleTeamsAnnouncement: true,
  qualifyingRoundIdentityConfirmation: true,
};

const statusData = {
  memberCount: 2,
  submissionState: "SUBMITTED",
  submittedAt: "2026-09-01T00:00:00.000Z",
  teamId: "team-1",
};

const teamBeforeAnnouncement = {
  award: null,
  id: "team-1",
  image: null,
  index: 1,
  name: "Team One",
  school: "School",
};

const qualifiedTeam = {
  ...teamBeforeAnnouncement,
  award: "REGISTRATION_COMPLETED",
};

const approvedReview = { status: "APPROVED" };

function renderDashboard(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MyTeam />
      </QueryClientProvider>,
    ),
  };
}

function setupSuccessfulDashboard() {
  fakes.featureFlags.mockResolvedValue(beforeAnnouncement);
  fakes.status.mockResolvedValue(statusData);
  fakes.team.mockResolvedValueOnce(teamBeforeAnnouncement).mockResolvedValueOnce(qualifiedTeam);
  fakes.review.mockResolvedValue(approvedReview);
  fakes.participants.mockResolvedValue([]);
  fakes.advisor.mockResolvedValue(null);
}

describe("MyTeam dashboard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        disconnect() {
          void this;
        }
        observe() {
          void this;
        }
      },
    );
    fakes.featureFlags.mockReset();
    fakes.status.mockReset();
    fakes.team.mockReset();
    fakes.review.mockReset();
    fakes.participants.mockReset();
    fakes.advisor.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("refreshes result data before opening the released selection modal", async () => {
    setupSuccessfulDashboard();
    const { queryClient } = renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-status").textContent).toBe("selection-pending");
      expect(fakes.team).toHaveBeenCalledOnce();
    });
    expect(screen.queryByTestId("result-modal-qualified")).toBeNull();

    queryClient.setQueryData(["featureFlags", "getAll"], afterAnnouncement);

    await waitFor(() => {
      expect(fakes.team).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("result-modal-qualified")).toBeDefined();
    });
  });

  it("renders a retry state when feedback loading fails without opening a failure modal", async () => {
    fakes.featureFlags.mockResolvedValue(afterAnnouncement);
    fakes.status.mockResolvedValue(statusData);
    fakes.team.mockResolvedValue({ ...teamBeforeAnnouncement, award: "NO_ACHIEVEMENT" });
    fakes.review.mockRejectedValue(new Error("feedback unavailable"));
    fakes.participants.mockResolvedValue([]);
    fakes.advisor.mockResolvedValue(null);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(screen.queryByTestId("result-modal-other")).toBeNull();
  });
});
