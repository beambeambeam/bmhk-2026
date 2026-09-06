/**
 * Deploy slash commands to Discord.
 *
 * Command list is baked in at build time via src/commands-manifest.ts.
 */
import { env } from "@bmhk-2026/env/discord";
import { REST, Routes } from "discord.js";
import { commands } from "./commands.manifest.js";

const { DISCORD_CLIENT_ID: clientId, DISCORD_TOKEN: token, GLOBAL: isGlobal } = env;
const guildId = env.DISCORD_GUILD_ID ?? "";

if (!isGlobal && guildId === "") {
  throw new Error("Missing environment variable: DISCORD_GUILD_ID (or set GLOBAL=true)");
}

// Build the payload from the statically imported command list
const payload = commands.map((cmd) => {
  console.log(`Loaded command: /${cmd.data.name}`);
  return cmd.data.toJSON();
});

// Push to Discord
const rest = new REST().setToken(token);

const route = isGlobal
  ? Routes.applicationCommands(clientId)
  : Routes.applicationGuildCommands(clientId, guildId);

console.log(
  `\nDeploying ${payload.length} command(s) ${isGlobal ? "globally" : `to guild ${guildId}`}…`,
);

await rest.put(route, { body: payload });
console.log(`Successfully deployed ${payload.length} command(s).`);
