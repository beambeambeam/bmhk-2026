import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { HONEYPOT_CHANNEL_KEY, HONEYPOT_LOG_CHANNEL_KEY } from "../../lib/honeypot.js";
import type { Command } from "../../types.js";

const removehoneypot: Command = {
  data: new SlashCommandBuilder()
    .setName("removehoneypot")
    .setDescription("(Admin) Turn the honeypot off.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Loaded lazily (not a top-level import) — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const store = getSettingsStore();

    const wasSet = store.get(HONEYPOT_CHANNEL_KEY) !== null;
    store.remove(HONEYPOT_CHANNEL_KEY);
    store.remove(HONEYPOT_LOG_CHANNEL_KEY);

    await interaction.reply({
      content: wasSet
        ? "Honeypot removed. Nobody is banned for posting there any more."
        : "No honeypot was set.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default removehoneypot;
