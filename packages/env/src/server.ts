import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const corsOrigins = z.string().transform((value, context) => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const parsedOrigins = z.array(z.url()).safeParse(origins);

  if (!parsedOrigins.success || parsedOrigins.data.length === 0) {
    context.addIssue({ code: "custom", message: "Must contain one or more valid URLs" });
    return z.NEVER;
  }

  return parsedOrigins.data;
});

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    AUDIT_HMAC_KEY_ID: z.string().trim().min(1),
    AUDIT_HMAC_SECRET: z.string().min(32),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_ENDPOINT_URL_S3: z.url(),
    AWS_REGION: z.string().min(1),
    AWS_S3_BUCKET: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: corsOrigins,
    DATABASE_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_TENANT_ID: z.string().min(1).default("organizations"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
