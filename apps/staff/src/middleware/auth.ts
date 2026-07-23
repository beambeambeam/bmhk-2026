import { createMiddleware } from "@tanstack/react-start";

import { authClient } from "@bmhk-2026/client/auth-client";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: request.headers,
      throw: true,
    },
  });
  return next({
    context: { session },
  });
});
