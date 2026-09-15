/**
 * Deploy slash commands to Discord.
 *
 * Command list is baked in at build time via src/commands-manifest.ts.
 * Staff-scoped commands (guildScope: "staff") always deploy to
 * DISCORD_STAFF_GUILD_ID specifically, never globally — see
 * partition-commands.ts and verifystaff.ts.
 */
import { env } from "@bmhk-2026/env/discord";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.manifest.js";
import { partitionCommandsByGuildScope } from "./lib/partition-commands.js";
import type { Command } from "./types.js";

const {
  DISCORD_CLIENT_ID: clientId,
  DISCORD_STAFF_GUILD_ID: staffGuildId,
  DISCORD_TOKEN: token,
  GLOBAL: isGlobal,
} = env;
const guildId = env.DISCORD_GUILD_ID ?? "";

if (!isGlobal && guildId === "") {
  throw new Error("Missing environment variable: DISCORD_GUILD_ID (or set GLOBAL=true)");
}

const { main, staff } = partitionCommandsByGuildScope(commands);
const rest = new REST().setToken(token);

async function deploy(cmds: Command[], route: `/${string}`, label: string): Promise<void> {
  const payload = cmds.map((cmd) => {
    console.log(`Loaded command: /${cmd.data.name}`);
    return cmd.data.toJSON();
  });

  console.log(`\nDeploying ${payload.length} command(s) to ${label}…`);
  await rest.put(route, { body: payload });
  console.log(`Successfully deployed ${payload.length} command(s) to ${label}.`);
}

const mainRoute = isGlobal
  ? Routes.applicationCommands(clientId)
  : Routes.applicationGuildCommands(clientId, guildId);

await deploy(main, mainRoute, isGlobal ? "global" : `guild ${guildId}`);
await deploy(
  staff,
  Routes.applicationGuildCommands(clientId, staffGuildId),
  `staff guild ${staffGuildId}`,
);
