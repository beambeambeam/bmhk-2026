import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { chunkLines } from "../../lib/chunk-lines.js";
import { fetchAbsentTeams } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

const DISCORD_MESSAGE_LIMIT = 2000;

const listabsentteams: Command = {
  data: new SlashCommandBuilder()
    .setName("listabsentteams")
    .setDescription("(Admin) List eligible teams where nobody has verified on Discord.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();
    const teams = await fetchAbsentTeams();
    if (teams.length === 0) {
      await interaction.editReply({ content: "Every eligible team has a verified participant." });
      return;
    }

    const lines = [
      `${teams.length} team(s) with no participant verified:`,
      ...teams.map(
        ({ index, name, school }) => `BH${String(index).padStart(3, "0")} ${name} (${school})`,
      ),
    ];
    const [first, ...rest] = chunkLines(lines, DISCORD_MESSAGE_LIMIT);
    await interaction.editReply({ content: first });
    for (const content of rest) {
      // Follow-ups stay in order, so they are sent one at a time.
      // eslint-disable-next-line no-await-in-loop
      await interaction.followUp({ content });
    }
  },
};

export default listabsentteams;
