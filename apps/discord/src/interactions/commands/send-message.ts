import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";

const sendMessage: Command = {
  data: new SlashCommandBuilder()
    .setName("sendmessage")
    .setDescription("(Admin) Send message as a bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName("message").setDescription("Message to send").setRequired(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("The channel to send the message to. Defaults to current channel.")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const caption = interaction.options.getString("message", true).replaceAll("\\n", "\n");

    const channelOption = interaction.options.getChannel("channel");
    const channel = channelOption
      ? interaction.client.channels.cache.get(channelOption.id)
      : interaction.channel;

    if (channel?.isSendable() !== true) {
      await interaction.editReply({
        content: "Cannot send messages in this channel.",
      });
      return;
    }

    await channel.send({ content: caption });

    await interaction.editReply({ content: "Message sent." });
  },
};

export default sendMessage;
