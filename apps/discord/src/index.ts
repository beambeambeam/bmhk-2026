import { GatewayIntentBits, Partials } from "discord.js";
import { loadEvents } from "./loaders/events.js";
import { loadInteractions } from "./loaders/interactions.js";
import { getDb } from "./lib/db.js";
import { BotClient } from "./types.js";

getDb();

const client = new BotClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

loadEvents(client);
loadInteractions(client);

const token = Bun.env.DISCORD_TOKEN;
if (token === undefined || token === "") {
  throw new Error("Missing environment variable: DISCORD_TOKEN");
}

await client.login(token);
