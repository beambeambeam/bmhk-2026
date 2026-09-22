import { env } from "@bmhk-2026/env/web";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { ac, roles } from "@bmhk-2026/auth/permission";
import { createAuthClient } from "better-auth/react";

export function getApiUrl(): string {
  return typeof window === "undefined"
    ? (env.VITE_SERVER_INTERNAL_URL ?? env.VITE_SERVER_URL)
    : env.VITE_SERVER_URL;
}

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles,
    }),
  ],
});
