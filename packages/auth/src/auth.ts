import { createDb } from "@bmhk-2026/db";
import * as schema from "@bmhk-2026/db/schema/auth";
import { env } from "@bmhk-2026/env/server";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin as adminPlugin } from "better-auth/plugins";
import type { MicrosoftEntraIDProfile } from "better-auth/social-providers";

import { ac, roles } from "./permission";

export type AuthDatabase = ReturnType<typeof createDb>;

const STAFF_EMAIL_DOMAIN = "@kmutt.ac.th";

function getCookieAttributes() {
  if (env.NODE_ENV === "production") {
    return {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    } as const;
  }

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  } as const;
}

function getMicrosoftEmail(profile: MicrosoftEntraIDProfile) {
  return (profile.email ?? profile.preferred_username ?? profile.upn ?? "").toLowerCase();
}

function assertStaffEmail(email: string) {
  if (!email.endsWith(STAFF_EMAIL_DOMAIN)) {
    throw new APIError("FORBIDDEN", {
      message: `Only ${STAFF_EMAIL_DOMAIN} staff accounts can sign in.`,
    });
  }
}

export function createAuth(database: AuthDatabase = createDb()) {
  return betterAuth({
    advanced: {
      defaultCookieAttributes: getCookieAttributes(),
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    disabledPaths: ["/is-username-available"],
    emailAndPassword: {
      enabled: true,
    },
    logger: {
      level: "debug",
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
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
      microsoft: {
        clientId: env.MICROSOFT_CLIENT_ID,
        clientSecret: env.MICROSOFT_CLIENT_SECRET,
        mapProfileToUser: (profile) => {
          const email = getMicrosoftEmail(profile);
          assertStaffEmail(email);

          return {
            email,
            emailVerified: profile.email_verified ?? true,
          };
        },
        tenantId: env.MICROSOFT_TENANT_ID,
      },
    },
    trustedOrigins: env.CORS_ORIGIN,
  });
}
