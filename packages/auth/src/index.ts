import { createDb } from "@bmhk-2026/db";
import * as schema from "@bmhk-2026/db/schema/auth";
import { env } from "@bmhk-2026/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin as adminPlugin } from "better-auth/plugins";
import { ac, roles } from "./permission";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    disabledPaths: ["/is-username-available"],
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      username(),
      adminPlugin({
        ac,
        defaultRole: "user",
        roles,
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGIN,
  });
}

export const auth = createAuth();
