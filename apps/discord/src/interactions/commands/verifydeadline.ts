import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  VERIFY_DEADLINE_KEY,
  isVerifyWindowClosed,
  parseBangkokDateTime,
} from "../../lib/verify-deadline.js";
import type { Command } from "../../types.js";

const MS_PER_SECOND = 1000;

function discordTimestamp(epochMs: number): string {
  const seconds = Math.floor(epochMs / MS_PER_SECOND);
  return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

const verifydeadline: Command = {
  data: new SlashCommandBuilder()
    .setName("verifydeadline")
    .setDescription("(Admin) Manage when participant verification closes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Close participant verification at a Bangkok time.")
        .addStringOption((opt) =>
          opt
            .setName("datetime")
            .setDescription("Bangkok time, format YYYY-MM-DD HH:mm (e.g. 2026-10-01 18:00).")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Remove the deadline so verification stays open."),
    )
    .addSubcommand((sub) =>
      sub.setName("show").setDescription("Show the current deadline and whether it has passed."),
    ),

  async execute(interaction) {
    // Loaded lazily (not a top-level import) — see apps/discord/src/lib/db.ts.
    const { getSettingsStore } = await import("../../lib/settings-store.js");
    const store = getSettingsStore();
    const subcommand = interaction.options.getSubcommand(true);
    const now = Date.now();

    let content: string;
    if (subcommand === "set") {
      const input = interaction.options.getString("datetime", true);
      const deadline = parseBangkokDateTime(input);
      if (deadline === null) {
        content = `Couldn't read \`${input}\`. Use \`YYYY-MM-DD HH:mm\` in Bangkok time, e.g. \`2026-10-01 18:00\`.`;
      } else {
        store.set(VERIFY_DEADLINE_KEY, String(deadline));
        content = `Participant verification closes ${discordTimestamp(deadline)}.`;
        if (deadline <= now) {
          content += "\n⚠️ That time has already passed, so verification is closed now.";
        }
      }
    } else if (subcommand === "clear") {
      const wasSet = store.get(VERIFY_DEADLINE_KEY) !== null;
      store.remove(VERIFY_DEADLINE_KEY);
      content = wasSet
        ? "Deadline removed. Participant verification is open."
        : "No deadline was set. Participant verification is open.";
    } else {
      const stored = store.get(VERIFY_DEADLINE_KEY);
      if (stored === null) {
        content = "No deadline set. Participant verification is open.";
      } else {
        const state = isVerifyWindowClosed(stored, now) ? "closed" : "open";
        content = `Deadline: ${discordTimestamp(Number(stored))}. Verification is **${state}**.`;
      }
    }

    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  },
};

export default verifydeadline;
