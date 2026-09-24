import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { runBestEffort } from "../../lib/best-effort.js";
import { buildCleanupSteps } from "../../lib/member-cleanup.js";
import { getRoleSettings } from "../../lib/role-settings.js";
import { unlinkStaff } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

const unlinkstaff: Command = {
  data: new SlashCommandBuilder()
    .setName("unlinkstaff")
    .setDescription("(Admin) Unlink a Discord user from their staff account.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to unlink.").setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.inGuild() || interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = interaction.options.getUser("user", true);
    const result = await unlinkStaff(user.id);
    if (result.status === "NOT_LINKED") {
      await interaction.editReply({
        allowedMentions: { parse: [] },
        content: `<@${user.id}> is not linked to a staff account.`,
      });
      return;
    }

    const { admin, registrationStaff, staff } = await getRoleSettings();
    const steps = await buildCleanupSteps(interaction.guild, user.id, {
      channelId: result.category_id,
      roleIds: [staff, admin, registrationStaff],
      roleLabel: "staff/admin roles",
    });
    const failed = await runBestEffort(steps);

    const lines = [`Unlinked <@${user.id}> from their staff account.`];
    if (failed.length > 0) {
      lines.push(`⚠️ Cleanup failed: ${failed.join(", ")}`);
    }
    await interaction.editReply({ allowedMentions: { parse: [] }, content: lines.join("\n") });
  },
};

export default unlinkstaff;
