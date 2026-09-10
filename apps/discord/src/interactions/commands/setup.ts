import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../../types.js";

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
    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
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
