import { env } from "@bmhk-2026/env/discord";
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

await client.login(env.DISCORD_TOKEN);
