import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { Modal } from "../../types.js";
import { bmhkDiscordStatus, queryDiscordCode } from "../../services/verify-api.js";

const CODE_PATTERN = /^[a-zA-Z0-9]{8}$/u;

const verifyCode: Modal = {
  customId: "verify-code",

  async execute(interaction) {
    const code = interaction.fields.getTextInputValue("code");

    if (!CODE_PATTERN.test(code)) {
      await interaction.reply({
        content: "รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const result = await queryDiscordCode(code);

    if (result.status === bmhkDiscordStatus.NOT_FOUND) {
      await interaction.reply({
        content: "รหัสไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (result.status === bmhkDiscordStatus.ALREADY_REDEEMED) {
      await interaction.reply({
        content: "รหัสนี้ถูกใช้ยืนยันตัวตนครบตามจำนวนที่กำหนดแล้ว หากนี่เป็นข้อผิดพลาด กรุณาติดต่อทีมงาน",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // status === SUCCESS
    const { data } = result;
    if (!data) {
      await interaction.reply({
        content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("พบข้อมูลผู้เข้าแข่งขัน")
      .addFields(
        { name: "ชื่อ", value: data.name },
        { name: "ทีม", value: data.team },
        { name: "โรงเรียน", value: data.school },
      )
      .setColor(0x58_65_f2);

    const confirmButton = new ButtonBuilder()
      .setCustomId(`verify-confirm:${code}`)
      .setLabel("ยืนยัน")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

    await interaction.reply({
      components: [row],
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default verifyCode;
