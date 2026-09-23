import {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getVerifyClosedMessage } from "../../lib/verify-deadline.js";
import type { Command } from "../../types.js";

const verify: Command = {
  data: new SlashCommandBuilder().setName("verify").setDescription("ยืนยันตัวตนผู้เข้าแข่งขัน"),

  async execute(interaction) {
    const closedMessage = await getVerifyClosedMessage();
    if (closedMessage !== null) {
      await interaction.reply({ content: closedMessage, flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder().setCustomId("verify-code").setTitle("ยืนยันตัวตน");

    const codeInput = new TextInputBuilder()
      .setCustomId("code")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const codeLabel = new LabelBuilder()
      .setLabel("กรอกรหัสที่ได้จากเว็บ")
      .setTextInputComponent(codeInput);

    modal.addLabelComponents(codeLabel);

    await interaction.showModal(modal);
  },
};

export default verify;
