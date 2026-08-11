// @vitest-environment jsdom

import { createElement } from "react";
import type { ReactNode } from "react";
import type { FeatureFlags } from "@bmhk-2026/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFeatureFlag, useFeatureFlags } from "../feature-flags";

const featureFlagsQueryOptions = {
  queryFn: vi.fn<() => Promise<FeatureFlags>>(),
  queryKey: ["featureFlags", "getAll"],
};

const availableRegistration: FeatureFlags = {
  eligibleTeamsAnnouncement: true,
  finalRound: false,
  qualifyingResultsAnnouncement: false,
  qualifyingRound: false,
  registration: true,
};

// oxlint-disable-next-line vitest/prefer-import-in-mock -- This boundary fake intentionally supplies only the RPC query used by the hooks.
vi.mock("../orpc", () => ({
  orpc: {
    featureFlags: {
      getAll: {
        queryOptions: (options: Record<string, unknown>) => ({
          ...options,
          ...featureFlagsQueryOptions,
        }),
      },
    },
  },
}));

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe(useFeatureFlags, () => {
  it("returns feature availability received from the backend", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(featureFlagsQueryOptions.queryKey, availableRegistration);

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current).toStrictEqual(availableRegistration);
  });

  it("shares one backend result across both hooks for the browser document", async () => {
    featureFlagsQueryOptions.queryFn.mockResolvedValue(availableRegistration);
    const queryClient = new QueryClient();
    const wrapper = createWrapper(queryClient);
    const firstRender = renderHook(
      () => ({ all: useFeatureFlags(), registration: useFeatureFlag("registration") }),
      { wrapper },
    );

    await waitFor(() => {
      expect(firstRender.result.current).toStrictEqual({
        all: availableRegistration,
        registration: true,
      });
    });
    firstRender.unmount();
    const secondRender = renderHook(() => useFeatureFlag("registration"), { wrapper });

    expect(secondRender.result.current).toBeTruthy();
    expect(featureFlagsQueryOptions.queryFn).toHaveBeenCalledOnce();
  });

  it("fails closed after one unsuccessful backend request", async () => {
    featureFlagsQueryOptions.queryFn.mockRejectedValue(new Error("backend unavailable"));
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(featureFlagsQueryOptions.queryFn).toHaveBeenCalledOnce();
    });
    expect(result.current).toStrictEqual({
      eligibleTeamsAnnouncement: false,
      finalRound: false,
      qualifyingResultsAnnouncement: false,
      qualifyingRound: false,
      registration: false,
    });
  });
});
