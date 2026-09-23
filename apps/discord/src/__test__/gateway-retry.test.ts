import { describe, expect, it } from "vitest";

import { retryOnGatewayRateLimit } from "../lib/gateway-retry";

function rateLimitError(retryAfterSeconds: number): Error {
  return Object.assign(new Error("Request with opcode 8 was rate limited."), {
    data: { opcode: 8, retry_after: retryAfterSeconds },
    name: "GatewayRateLimitError",
  });
}

describe(retryOnGatewayRateLimit, () => {
  it("waits the reported retry_after and retries until the request succeeds", async () => {
    const waits: number[] = [];
    let calls = 0;

    const result = await retryOnGatewayRateLimit(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw rateLimitError(1.5);
        }
        return await Promise.resolve("members");
      },
      async (ms) => {
        waits.push(ms);
        await Promise.resolve();
      },
    );

    expect(result).toBe("members");
    expect(waits).toStrictEqual([1500, 1500]);
  });

  it("rethrows other errors without retrying", async () => {
    let calls = 0;
    const failing = retryOnGatewayRateLimit(async () => {
      calls += 1;
      await Promise.reject(new Error("Missing Access"));
    });

    await expect(failing).rejects.toThrow("Missing Access");
    expect(calls).toBe(1);
  });

  it("gives up after the attempt limit and surfaces the rate limit", async () => {
    let calls = 0;
    const failing = retryOnGatewayRateLimit(
      async () => {
        calls += 1;
        await Promise.reject(rateLimitError(0));
      },
      async () => {
        await Promise.resolve();
      },
    );

    await expect(failing).rejects.toThrow("rate limited");
    expect(calls).toBe(3);
  });
});
