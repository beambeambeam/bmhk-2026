// @vitest-environment jsdom

import { ORPCError } from "@orpc/client";
import { dehydrate, environmentManager, hydrate } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { createQueryClient } from "../query-client";

describe(createQueryClient, () => {
  it("creates an isolated cache for each application lifetime", () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });

  it("keeps successful queries fresh for one minute", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it("retries transient query failures", async () => {
    const queryClient = createQueryClient();
    const queryFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ORPCError("SERVICE_UNAVAILABLE"))
      .mockResolvedValue("available");

    await expect(
      queryClient.fetchQuery({ queryFn, queryKey: ["health"], retryDelay: 0 }),
    ).resolves.toBe("available");
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent query failures", async () => {
    const queryClient = createQueryClient();
    const queryFn = vi.fn<() => Promise<never>>().mockRejectedValue(new ORPCError("UNAUTHORIZED"));

    await expect(
      queryClient.fetchQuery({ queryFn, queryKey: ["private"], retryDelay: 0 }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(queryFn).toHaveBeenCalledOnce();
  });

  it("does not retry queries during server rendering", async () => {
    const wasServer = environmentManager.isServer();
    environmentManager.setIsServer(() => true);
    const queryClient = createQueryClient();
    const queryFn = vi
      .fn<() => Promise<never>>()
      .mockRejectedValue(new ORPCError("SERVICE_UNAVAILABLE"));

    try {
      await expect(
        queryClient.fetchQuery({ queryFn, queryKey: ["server-health"], retryDelay: 0 }),
      ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
      expect(queryFn).toHaveBeenCalledOnce();
    } finally {
      environmentManager.setIsServer(() => wasServer);
    }
  });

  it("does not retry mutations", () => {
    const queryClient = createQueryClient();

    expect(queryClient.getDefaultOptions().mutations?.retry).toBeFalsy();
  });

  it("preserves rich oRPC values through cache hydration", () => {
    const sourceClient = createQueryClient();
    const queryKey = ["team", { id: 1n }] as const;
    const createdAt = new Date("2026-08-12T00:00:00.000Z");

    sourceClient.setQueryData(queryKey, { createdAt });

    const destinationClient = createQueryClient();
    hydrate(destinationClient, dehydrate(sourceClient));

    expect(destinationClient.getQueryData(queryKey)).toStrictEqual({ createdAt });
  });
});
