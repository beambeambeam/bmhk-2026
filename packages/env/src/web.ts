/// <reference types="vite/client" />

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv = import.meta.env;

export const env = createEnv({
  client: {
    VITE_BMHK_ENV: z.enum(["staging", "production"]).default("staging"),
    VITE_COMMIT_SHA: z.string().default("unknown"),
    VITE_DISCORD_INVITE_URL: z.url().default("https://discord.gg/bangmodhackathon"),
    VITE_DISCORD_VERIFY_CHANNEL_URL: z
      .url()
      .default("https://discord.com/channels/1549696123826864249/1549696124611203093"),
    VITE_SERVER_URL: z.url(),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
