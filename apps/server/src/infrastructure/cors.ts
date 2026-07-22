import { cors } from "@elysiajs/cors";
import type { AnyElysia } from "elysia";

export function createCorsPlugin(origin: string): AnyElysia {
  return cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    origin,
  });
}
