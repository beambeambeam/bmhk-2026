import type { Event } from "../types.js";
import { ActivityType, Client, PresenceUpdateStatus } from "discord.js";

const clientReady: Event<"clientReady"> = {
    name: "clientReady",
    once: true,
    async execute(client: Client<true>) {
        console.log(`[Ready] Logged in as ${client.user.tag}`);
        client.user.setPresence({
            activities: [
                {
                    name: "Bangmod Hackathon 2026",
                    type: ActivityType.Playing
                },
            ],
            status: PresenceUpdateStatus.Online,
        });
    },
};

export default clientReady;
