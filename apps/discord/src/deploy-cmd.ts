/**
 * Deploy slash commands to Discord.
 *
 * Command list is baked in at build time via src/commands-manifest.ts.
 */
import { REST, Routes } from "discord.js";
import { commands } from "./commands.manifest.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const isGlobal = process.env.GLOBAL === "true";

if (!token) throw new Error("Missing environment variable: DISCORD_TOKEN");
if (!clientId) throw new Error("Missing environment variable: DISCORD_CLIENT_ID");
if (!isGlobal && !guildId) {
    throw new Error("Missing environment variable: DISCORD_GUILD_ID (or set GLOBAL=true)");
}

// Build the payload from the statically imported command list
const payload = commands
    .filter((cmd: any) => cmd?.data)
    .map((cmd: any) => {
        console.log(`Loaded command: /${cmd.data.name}`);
        return cmd.data.toJSON();
    });

// Push to Discord
const rest = new REST().setToken(token);

const route = isGlobal ? Routes.applicationCommands(clientId) : Routes.applicationGuildCommands(clientId, guildId!);

console.log(`\nDeploying ${payload.length} command(s) ${isGlobal ? "globally" : `to guild ${guildId}`}…`);

const result = await rest.put(route, { body: payload });
console.log(`Successfully deployed ${(result as unknown[]).length} command(s).`);
