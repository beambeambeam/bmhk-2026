import type { Event } from "../types.js";
import type { Client } from "discord.js";
import { ActivityType, PresenceUpdateStatus } from "discord.js";

const clientReady: Event<"clientReady"> = {
  execute(client: Client<true>) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [
        {
          name: "Bangmod Hackathon 2026",
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
    });
  },
  name: "clientReady",
  once: true,
};

export default clientReady;
