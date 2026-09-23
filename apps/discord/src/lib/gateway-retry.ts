import { setTimeout as sleepFor } from "node:timers/promises";

const MAX_ATTEMPTS = 3;
const MS_PER_SECOND = 1000;

// ponytail: duck-typed, GatewayRateLimitError lives in @discordjs/util which is not a direct dep
function retryAfterMs(error: unknown): number | null {
  if (!(error instanceof Error) || error.name !== "GatewayRateLimitError") {
    return null;
  }
  const retryAfter = (error as Error & { data?: { retry_after?: unknown } }).data?.retry_after;
  return typeof retryAfter === "number" ? retryAfter * MS_PER_SECOND : null;
}

/**
 * Retries gateway requests (e.g. `guild.members.fetch()`, opcode 8) that Discord rate limits.
 * REST calls need no wrapper: discord.js already queues and waits on HTTP 429s.
 */
export async function retryOnGatewayRateLimit<T>(
  run: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = sleepFor,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await run();
    } catch (error) {
      const waitMs = retryAfterMs(error);
      if (waitMs === null || attempt >= MAX_ATTEMPTS) {
        throw error;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(waitMs);
    }
  }
}
