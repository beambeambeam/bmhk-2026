import { env } from "@bmhk-2026/env/discord";
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";

import { createStaffVerifyToken } from "../../services/staff-verify-api.js";
import type { Command } from "../../types.js";

const verifystaff: Command = {
  data: new SlashCommandBuilder()
    .setName("verifystaff")
    .setDescription("เชื่อมบัญชี Discord กับบัญชีทีมงาน")
    // Hidden from everyone by default; an admin grants it to the staff/admin
    // roles per-guild in Server Settings -> Integrations -> [bot] -> this
    // command. The staff eligibility check itself still happens server-side
    // (INELIGIBLE_ROLE), this just keeps it out of participants' command list.
    .setDefaultMemberPermissions(0),

  async execute(interaction) {
    const { token } = await createStaffVerifyToken(interaction.user.id, interaction.user.username);
    const link = new URL("/verifystaff", env.STAFF_BASE_URL);
    link.searchParams.set("token", token);

    const embed = new EmbedBuilder()
      .setTitle("เชื่อมบัญชีทีมงาน")
      .setDescription(`กดลิงก์นี้เพื่อเชื่อมบัญชี Discord ของคุณกับบัญชีทีมงาน:\n${link.toString()}`);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default verifystaff;
