import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";

const ping: Command = {
    data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),

    async execute(interaction) {
        const { resource } = await interaction.reply({ content: "Pinging…", withResponse: true });
        const sent = resource!.message!;
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;

        await interaction.editReply(`Pong!\n> Round-trip: **${latency}ms** | WebSocket: **${wsLatency}ms**`);
    },
};

export default ping;
