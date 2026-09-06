import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";
import { getSettingsStore } from "../../lib/settings-store.js";

const DEFAULT_VERIFY_PROMPT =
  `# โปรดยืนยันตัวตนเพื่อเชื่อมบัญชี Discord\n\n` +
  `ใช้คำสั่ง \`/verify\` เพื่อเริ่มกระบวนการยืนยันตัวตนและเชื่อมต่อบัญชี ` +
  `จากนั้นใส่รหัสยืนยันที่ได้รับจากระบบ หากยังไม่มีรหัสยืนยันสามารถรับได้บน[เว็บไซต์]` +
  `(${process.env.WEBSITE_BASE_URL}/my-team)`;

const createVerifyPrompt: Command = {
  data: new SlashCommandBuilder()
    .setName("createverifyprompt")
    .setDescription("(Admin) Send the onboarding prompt message.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Caption to show. Use /verify as the call-to-action (default provided).")
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("messagetype")
        .setDescription("The type of message to send.")
        .addChoices({ name: "Normal", value: "normal" }, { name: "Embed", value: "embed" }),
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("The channel to send the message to. Defaults to current channel.")
        .setRequired(false),
    ),

  async execute(interaction) {
    const settingStore = getSettingsStore();
    const participantRole = settingStore.get("participantRole");

    if (participantRole === null) {
      await interaction.reply({
        content: "Psst. Bot is not configured yet. Run `/setup` first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const caption = (interaction.options.getString("message") ?? DEFAULT_VERIFY_PROMPT).replaceAll(
      "\\n",
      "\n",
    );

    const messageType = interaction.options.getString("messagetype") ?? "normal";

    const channelOption = interaction.options.getChannel("channel");
    const channel = channelOption
      ? interaction.client.channels.cache.get(channelOption.id)
      : interaction.channel;

    if (channel?.isSendable() !== true) {
      await interaction.reply({
        content: "Cannot send messages in this channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (messageType === "embed") {
      const embed = new EmbedBuilder().setDescription(caption).setColor(0x58_65_f2);
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send({ content: caption });
    }

    await interaction.reply({ content: "Message sent.", flags: MessageFlags.Ephemeral });
  },
};

export default createVerifyPrompt;
