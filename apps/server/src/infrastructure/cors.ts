import { cors } from "@elysiajs/cors";
import type { AnyElysia } from "elysia";

export function createCorsPlugin(origins: string[]): AnyElysia {
  return cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    origin: origins,
  });
}
