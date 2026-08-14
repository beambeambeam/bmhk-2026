import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SettingsStore } from "../../lib/settings-store.js";
import type { Command } from "../../types.js";

export type SettingsCommandInput =
  | { subcommand: "set"; key: string; value: string }
  | { subcommand: "get"; key: string }
  | { subcommand: "list" };

export function handleSettingsCommand(store: SettingsStore, input: SettingsCommandInput): string {
  if (input.subcommand === "set") {
    store.set(input.key, input.value);
    return `Set \`${input.key}\` to \`${input.value}\`.`;
  }

  if (input.subcommand === "get") {
    const value = store.get(input.key);
    return value === null
      ? `No value set for \`${input.key}\`.`
      : `\`${input.key}\` = \`${value}\``;
  }

  const rows = store.list();
  if (rows.length === 0) {
    return "No settings configured.";
  }
  return rows.map((row) => `\`${row.key}\` = \`${row.value}\``).join("\n");
}

const settings: Command = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Manage bot configuration values.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a configuration value.")
        .addStringOption((opt) =>
          opt.setName("key").setDescription("Setting key.").setRequired(true).setMinLength(1),
        )
        .addStringOption((opt) =>
          opt.setName("value").setDescription("Setting value.").setRequired(true).setMinLength(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("get")
        .setDescription("Get a configuration value.")
        .addStringOption((opt) =>
          opt.setName("key").setDescription("Setting key.").setRequired(true).setMinLength(1),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List all configuration values.")),

  async execute(interaction) {
    // Loaded lazily (not a top-level import) so this module stays importable
    // without pulling in bun:sqlite — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const store = getSettingsStore();
    const subcommand = interaction.options.getSubcommand(true);

    let reply: string;
    if (subcommand === "set") {
      const key = interaction.options.getString("key", true);
      const value = interaction.options.getString("value", true);
      reply = handleSettingsCommand(store, { key, subcommand: "set", value });
    } else if (subcommand === "get") {
      const key = interaction.options.getString("key", true);
      reply = handleSettingsCommand(store, { key, subcommand: "get" });
    } else {
      reply = handleSettingsCommand(store, { subcommand: "list" });
    }

    await interaction.reply({ content: reply, flags: MessageFlags.Ephemeral });
  },
};

export default settings;
