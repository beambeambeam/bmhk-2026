import { evlog } from "evlog/elysia";
import { initLogger } from "evlog";
import type { DrainFn, LoggerConfig } from "evlog";
import type { EvlogElysiaOptions } from "evlog/elysia";
import { createBetterStackDrain as createBetterStackAdapterDrain } from "evlog/better-stack";
import { env } from "@bmhk-2026/env/server";
import { Elysia } from "elysia";
import type { AnyElysia } from "elysia";

const isProduction = env.BMHK_ENVIRONMENT === "production";

export function createBetterStackDrain(): DrainFn | undefined {
  if (!isProduction || env.BETTER_STACK_API_KEY === undefined) {
    return undefined;
  }
  return createBetterStackAdapterDrain({
    apiKey: env.BETTER_STACK_API_KEY,
    endpoint: env.BETTER_STACK_ENDPOINT,
  });
}

/**
 * evlog's per-framework `drain` option replaces the global drain rather than
 * composing with it, so a plugin-level drain (e.g. the audit DB writer) must
 * be combined with Better Stack explicitly to reach both sinks.
 */
export function composeDrains(...drains: (DrainFn | undefined)[]): DrainFn {
  const active = drains.filter((drain): drain is DrainFn => drain !== undefined);
  return async (ctx) => {
    await Promise.allSettled(
      active.map(async (drain) => {
        await drain(ctx);
      }),
    );
  };
}

export function initializeObservability(config: Omit<LoggerConfig, "env"> = {}) {
  initLogger({
    drain: createBetterStackDrain(),
    ...config,
    env: { service: "bmhk-2026-server" },
  });
}

export function createObservabilityPlugin(options: EvlogElysiaOptions = {}): AnyElysia {
  return new Elysia({ name: "observability" })
    .use(evlog(options))
    .onBeforeHandle({ as: "global" }, ({ log, route }) => {
      log.set({ route });
    })
    .onAfterHandle({ as: "global" }, ({ responseValue, set }) => {
      if (responseValue instanceof Response) {
        set.status = responseValue.status;
      }
    });
}
