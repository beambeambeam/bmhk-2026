/// <reference types="vite/client" />

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv = import.meta.env;

export const env = createEnv({
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_BMHK_ENV: z.enum(["staging", "production"]).default("staging"),
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
