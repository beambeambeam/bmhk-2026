import { env } from "@bmhk-2026/env/discord";
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
        { name: "Commit", value: env.COMMIT_SHA },
        { name: "Commit Message", value: env.COMMIT_MSG },
        { name: "Committer", value: env.BUILD_TRIGGERED_BY },
        { name: "Build Date", value: env.BUILD_TIMESTAMP },
        { name: "Environment", value: env.BMHK_ENV },
      )
      .setTimestamp()
      .setURL(`https://github.com/beambeambeam/bmhk-2026/commit/${env.COMMIT_SHA}`);
    await interaction.editReply({ embeds: [msg] });
  },
};

export default version;
