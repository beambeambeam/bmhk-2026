import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SettingsStore } from "../../lib/settings-store.js";
import type { Command } from "../../types.js";

const ROLE_OPTIONS = [
  {
    description: "The role granted to participants.",
    key: "participantRole",
    option: "participantrole",
  },
  { description: "The role granted to staff.", key: "staffRole", option: "staffrole" },
  { description: "The role granted to admins.", key: "adminRole", option: "adminrole" },
  {
    description: "The role granted to registration staff; sees every team group channel.",
    key: "registrationStaffRole",
    option: "registrationstaffrole",
  },
] as const;

type RoleKey = (typeof ROLE_OPTIONS)[number]["key"];

/** Stores the given role ids only, so a rerun can add one role without re-picking the rest. */
export function applySetup(store: SettingsStore, roles: Partial<Record<RoleKey, string>>): string {
  const lines: string[] = [];
  for (const { key } of ROLE_OPTIONS) {
    const roleId = roles[key];
    if (roleId !== undefined) {
      store.set(key, roleId);
      lines.push(`\`${key}\` set to <@&${roleId}> (\`${roleId}\`).`);
    }
  }
  if (lines.length === 0) {
    return "No roles given; nothing changed.";
  }

  if (roles.registrationStaffRole !== undefined) {
    lines.push("Run `/repairpermission` to give it access to team group channels.");
  }
  const unset = ROLE_OPTIONS.filter(({ key }) => store.get(key) === null).map(
    ({ key }) => `\`${key}\``,
  );
  if (unset.length > 0) {
    lines.push(`Still not configured: ${unset.join(", ")}`);
  }
  return lines.join("\n");
}

const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("(Admin) Configure bot settings.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
for (const { description, option } of ROLE_OPTIONS) {
  data.addRoleOption((opt) => opt.setName(option).setDescription(description));
}

const setup: Command = {
  data,
  async execute(interaction) {
    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const roles: Partial<Record<RoleKey, string>> = {};
    for (const { key, option } of ROLE_OPTIONS) {
      const role = interaction.options.getRole(option);
      if (role !== null) {
        roles[key] = role.id;
      }
    }

    await interaction.reply({
      content: `<@${interaction.user.id}> ${applySetup(getSettingsStore(), roles)}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default setup;
