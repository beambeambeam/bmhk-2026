import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/elysia";
import { initLogger } from "evlog";
import { Elysia } from "elysia";
import type { AnyElysia } from "elysia";

export function initializeObservability() {
  initLogger({
    env: { service: "bmhk-2026-server" },
  });
}

export function createObservabilityPlugin(auth: BetterAuthInstance): AnyElysia {
  const identifyUser = createAuthMiddleware(auth, {
    exclude: ["/api/auth/**"],
    maskEmail: true,
  });

  return new Elysia({ name: "observability" }).use(evlog()).derive(async ({ request, log }) => {
    await identifyUser(log, request.headers, new URL(request.url).pathname);
    return {};
  });
}
