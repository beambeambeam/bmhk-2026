import { env } from "@bmhk-2026/env/discord";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Client } from "discord.js";

import { createStaffVerifyToken } from "../../services/staff-verify-api.js";
import type { Command } from "../../types.js";

const NOT_IN_MAIN_GUILD_MESSAGE = `กรุณาเข้าร่วมเซิร์ฟเวอร์แข่งขันก่อน แล้วจึงใช้คำสั่งนี้อีกครั้ง:\n${env.DISCORD_MAIN_GUILD_INVITE_URL}`;
const UNCONFIGURED_MESSAGE = "ระบบยังไม่ได้ตั้งค่า กรุณาติดต่อทีมงาน";

async function isMemberOfMainGuild(client: Client, discordUserId: string): Promise<boolean> {
  if (env.DISCORD_GUILD_ID === undefined) {
    return false;
  }

  const mainGuild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
  return await mainGuild.members
    .fetch(discordUserId)
    .then(() => true)
    .catch(() => false);
}

const verifystaff: Command = {
  data: new SlashCommandBuilder()
    .setName("verifystaff")
    .setDescription("เชื่อมบัญชี Discord กับบัญชีทีมงาน"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (env.DISCORD_GUILD_ID === undefined) {
      console.error("[verifystaff] DISCORD_GUILD_ID is not configured");
      await interaction.editReply({ content: UNCONFIGURED_MESSAGE });
      return;
    }

    if (!(await isMemberOfMainGuild(interaction.client, interaction.user.id))) {
      await interaction.editReply({
        content: NOT_IN_MAIN_GUILD_MESSAGE,
      });
      return;
    }

    const { token } = await createStaffVerifyToken(
      interaction.user.id,
      interaction.user.username,
      interaction.user.displayAvatarURL({ size: 128 }),
    );
    const link = new URL("/verifystaff", env.STAFF_BASE_URL);
    link.searchParams.set("token", token);

    const embed = new EmbedBuilder()
      .setTitle("เชื่อมบัญชีทีมงาน Bangmod Hackathon 2026")
      .setDescription(`กดลิงก์นี้เพื่อเชื่อมบัญชี Discord ของคุณกับบัญชีทีมงาน:\n${link.toString()}`);

    await interaction.editReply({ embeds: [embed] });
  },

  // Deployed only to DISCORD_STAFF_GUILD_ID (see deploy-cmd.ts), so
  // participants — who are never members of that guild — never see this
  // command at all; no per-role visibility grant needed on top of that.
  guildScope: "staff",
};

export default verifystaff;
