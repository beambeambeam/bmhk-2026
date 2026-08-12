import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function createDb(dbPath: string): Database {
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  return new Database(dbPath, { create: true });
}

// ponytail: no vitest coverage here — this repo's vitest suite runs under
// Node (see vite.config.ts), and `bun:sqlite` only resolves under the real
// Bun runtime; forcing Bun process-wide via bunfig.toml made the rest of the
// suite fail on zod resolution. Self-check instead: `bun run src/lib/db.ts`
// from apps/discord.
if (import.meta.main) {
  const { existsSync, rmSync } = await import("node:fs");

  const memDb = createDb(":memory:");
  const row = memDb.query<{ value: number }, []>("select 1 as value").get();
  if (row?.value !== 1) {
    throw new Error(`expected query to return value 1, got ${row?.value}`);
  }
  memDb.close();

  const filePath = path.join(import.meta.dirname, ".self-check.sqlite");
  const fileDb = createDb(filePath);
  fileDb.close();
  if (!existsSync(filePath)) {
    throw new Error(`expected createDb to create a file at ${filePath}`);
  }
  rmSync(filePath);

  console.log("db self-check passed");
}
