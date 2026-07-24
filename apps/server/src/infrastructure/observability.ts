import { evlog } from "evlog/elysia";
import { initLogger } from "evlog";
import type { LoggerConfig } from "evlog";
import type { EvlogElysiaOptions } from "evlog/elysia";
import { Elysia } from "elysia";
import type { AnyElysia } from "elysia";

export function initializeObservability(config: Omit<LoggerConfig, "env"> = {}) {
  initLogger({
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
