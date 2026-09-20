// @vitest-environment jsdom

import type { Team, TeamAward } from "@bmhk-2026/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AchievementsAward } from "../achievements-award";

const mocks = vi.hoisted(() => ({
  setAward: vi.fn<(input: { award: TeamAward; id: string }) => Promise<Team>>(),
}));

// oxlint-disable-next-line vitest/prefer-import-in-mock -- This boundary fake supplies only the award mutation and query keys used by the component.
vi.mock("@bmhk-2026/client/orpc", () => ({
  orpc: {
    teamRegistrationReviews: {
      list: {
        key: () => ["teamRegistrationReviews", "list"],
      },
    },
    teams: {
      list: {
        key: () => ["teams", "list"],
      },
      setAward: {
        mutationOptions: (options: { onSuccess?: () => Promise<void> }) => ({
          mutationFn: async (input: { award: TeamAward; id: string }) => {
            const team = await mocks.setAward(input);
            await options.onSuccess?.();
            return team;
          },
        }),
      },
    },
  },
}));

const team = {
  award: "NO_ACHIEVEMENT",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  id: "11111111-1111-4111-8111-111111111111",
  image: null,
  index: 1,
  memberCount: 3,
  name: "Team One",
  registrationSubmittedAt: null,
  school: "Test School",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: "user-1",
} satisfies Team;

describe("achievements award", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates participation rows after changing an award", async () => {
    const updatedTeam = { ...team, award: "ROUND_1_COMPLETED" } satisfies Team;
    mocks.setAward.mockResolvedValue(updatedTeam);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const teamsListKey = ["teams", "list"] as const;
    const reviewListKey = ["teamRegistrationReviews", "list"] as const;
    queryClient.setQueryData(teamsListKey, { data: [], pagination: {} });
    queryClient.setQueryData(reviewListKey, { pagination: {}, rows: [] });

    render(
      <QueryClientProvider client={queryClient}>
        <AchievementsAward team={team} />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "แก้ไขผลงานของทีม Team One" }));
    fireEvent.click(await screen.findByRole("combobox"));
    const awardOption = await screen.findByRole("option", { name: "ผ่านรอบคัดเลือก" });
    fireEvent.pointerDown(awardOption);
    fireEvent.click(awardOption);
    fireEvent.click(screen.getByRole("button", { name: "บันทึกการเปลี่ยนแปลง" }));
    const confirmationDialog = await screen.findByRole("alertdialog");
    const confirmButton = confirmationDialog.querySelector<HTMLButtonElement>(
      "[data-slot='alert-dialog-action']",
    );
    if (!confirmButton) {
      throw new Error("The award confirmation button was not rendered");
    }
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mocks.setAward).toHaveBeenCalledExactlyOnceWith({
        award: "ROUND_1_COMPLETED",
        id: team.id,
      });
    });
    expect(queryClient.getQueryState(teamsListKey)?.isInvalidated).toBeTruthy();
    expect(queryClient.getQueryState(reviewListKey)?.isInvalidated).toBeTruthy();
  });
});
