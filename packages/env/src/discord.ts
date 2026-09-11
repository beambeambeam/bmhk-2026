import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    // deploy-cmd.ts only: guild-scoped deploy needs it, global deploy doesn't
    BMHK_ENV: z.enum(["staging", "production"]).default("staging"),
    BUILD_TIMESTAMP: z.string().default("unknown"),
    BUILD_TRIGGERED_BY: z.string().default("unknown"),
    COMMIT_MSG: z.string().default("unknown"),
    COMMIT_SHA: z.string().default("unknown"),
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_GUILD_ID: z.string().min(1).optional(),
    DISCORD_TOKEN: z.string().min(1),
    GLOBAL: z.stringbool().default(false),
    SERVER_API_KEY: z.string().min(1),
    SERVER_BASE_URL: z.url(),
    WEBSITE_BASE_URL: z.url(),
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
