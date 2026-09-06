import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";
import { getSettingsStore } from "../../lib/settings-store.js";

const setup: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("(Admin) Configure bot settings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((opt) =>
      opt
        .setName("participantrole")
        .setDescription("The role granted to participants.")
        .setRequired(true),
    )
    .addRoleOption((opt) =>
      opt.setName("staffrole").setDescription("The role granted to staff.").setRequired(true),
    ),
  async execute(interaction) {
    const participantrole = interaction.options.getRole("participantrole", true);
    const staffRole = interaction.options.getRole("staffrole", true);

    const settingsStore = getSettingsStore();
    settingsStore.set("participantRole", participantrole.id);
    settingsStore.set("staffRole", staffRole.id);

    await interaction.reply({
      content: `<@${interaction.user.id}> \`participantRole\` set to <@&${participantrole.id}> (\`${participantrole.id}\`), staffRole set to <@&${staffRole.id}> (\`${staffRole.id}\`).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default setup;
