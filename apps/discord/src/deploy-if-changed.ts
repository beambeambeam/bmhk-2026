/**
 * Deploy slash commands only if the command definitions changed since the
 * last successful deploy. Avoids re-hitting Discord's rate-limited command
 * registration endpoint on every container restart.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { commands } from "./commands.manifest.js";
import type { Command } from "./types.js";

export function hashCommands(cmds: Command[]): string {
  const payload = cmds.map((cmd) => cmd.data.toJSON());
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

if (import.meta.main) {
  const dbPath = Bun.env.DISCORD_DB_PATH ?? "data/discord.sqlite";
  const hashPath = path.join(path.dirname(dbPath), "commands.hash");

  const hash = hashCommands(commands);

  const previousHash = (() => {
    try {
      return readFileSync(hashPath, "utf-8");
    } catch {
      return null;
    }
  })();

  if (previousHash === hash) {
    console.log("Slash commands unchanged, skipping deploy.");
    process.exit(0);
  }

  await import("./deploy-cmd.js");

  mkdirSync(path.dirname(hashPath), { recursive: true });
  writeFileSync(hashPath, hash);
}
