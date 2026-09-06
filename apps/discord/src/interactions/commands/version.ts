import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";

const version: Command = {
  data: new SlashCommandBuilder().setName("version").setDescription("App's version information"),

  async execute(interaction) {
    await interaction.deferReply();
    const msg = new EmbedBuilder()
      .setTitle("BMHK Discord App Version Info")
      .setColor(2_326_507)
      .addFields(
        { name: "Commit", value: process.env.COMMIT_SHA ?? "unknown" },
        { name: "Commit Message", value: process.env.COMMIT_MSG ?? "unknown" },
        { name: "Committer", value: process.env.BUILD_TRIGGERED_BY ?? "unknown" },
        { name: "Build Date", value: process.env.BUILD_TIMESTAMP ?? "unknown" },
        { name: "Environment", value: process.env.BMHK_ENV ?? "unknown" },
      )
      .setTimestamp()
      .setURL(`https://github.com/beambeambeam/bmhk-2026/commit/${process.env.COMMIT_SHA ?? ""}`);
    await interaction.editReply({ embeds: [msg] });
  },
};

export default version;
