import { describe, expect, it, vi } from "vitest";

import { serverFetch } from "../lib/server-fetch";

describe(serverFetch, () => {
  it("sends the configured bot API key", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await serverFetch("/api/discord/query?code=ABCD2345");

    expect(fetch).toHaveBeenCalledWith(
      new URL("/api/discord/query?code=ABCD2345", "http://localhost:3000"),
      expect.objectContaining({
        headers: {
          "content-type": "application/json",
          "x-api-key": "test-server-api-key",
        },
      }),
    );
  });

  it("does not include query values in failed-request errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 503 }));

    await expect(serverFetch("/api/discord/query?code=secret-code")).rejects.toThrow(
      "Request to /api/discord/query failed with status 503",
    );
  });
});
