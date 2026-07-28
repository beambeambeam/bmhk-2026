import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { insertNewStaffs } from "./lib/staff-data.js";
import { loadEvents } from "./loaders/events.js";
import { loadInteractions } from "./loaders/interactions.js";
import type { BotClient, Button, Command, Modal, SelectMenu } from "./types.js";

const requiredEnvVars = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "PG_HOST",
  "PG_USER",
  "PG_PASSWORD",
  "PG_DBNAME",
  "SHEET_ID",
  "SHEET_NAME",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
}) as BotClient;

client.commands = new Collection<string, Command>();
client.buttons = new Collection<string, Button>();
client.modals = new Collection<string, Modal>();
client.selectMenus = new Collection<string, SelectMenu>();

await loadEvents(client);
await loadInteractions(client);

await insertNewStaffs();
setInterval(
  async () => {
    await insertNewStaffs();
  },
  60 * 60 * 1000,
); // every hour

const token = Bun.env.DISCORD_TOKEN;
if (!token) {
  throw new Error("Missing environment variable: DISCORD_TOKEN");
}

await client.login(token);
