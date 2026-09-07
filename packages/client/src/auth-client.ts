import { env } from "@bmhk-2026/env/web";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { ac, roles } from "@bmhk-2026/auth/permission";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles,
    }),
  ],
});
