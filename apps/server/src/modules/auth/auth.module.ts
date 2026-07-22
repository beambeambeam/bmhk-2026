import { Elysia } from "elysia";

export interface AuthHandler {
  handler: (request: Request) => Response | Promise<Response>;
}

export function createAuthModule(auth: AuthHandler) {
  return new Elysia({ name: "auth" }).all("/api/auth/*", ({ request, status }) => {
    if (request.method === "GET" || request.method === "POST") {
      return auth.handler(request);
    }

    return status(405);
  });
}
