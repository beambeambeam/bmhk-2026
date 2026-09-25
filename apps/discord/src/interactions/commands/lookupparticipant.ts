import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { fetchLookupParticipant } from "../../services/discord-admin-api.js";
import type { ParticipantLookup } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

export function formatLookupParticipant(userId: string, result: ParticipantLookup): string {
  if (result.status === "NOT_FOUND") {
    return `<@${userId}> has no verified participant record.`;
  }

  return [
    `Verify code: \`${result.code}\``,
    `Name: ${result.name_th}`,
    `Team: ${result.team_name}`,
    `School: ${result.school}`,
    `Email: ${result.contact.email}`,
    `Phone: ${result.contact.phone}`,
    `Line: ${result.contact.line_id ?? "—"}`,
  ].join("\n");
}

const lookupparticipant: Command = {
  data: new SlashCommandBuilder()
    .setName("lookupparticipant")
    .setDescription("(Admin) Look up a verified participant by their Discord account.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The Discord user to look up.").setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt.setName("public").setDescription("Post visibly instead of only to you (default: false)."),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const isPublic = interaction.options.getBoolean("public") ?? false;

    await interaction.deferReply(isPublic ? {} : { flags: MessageFlags.Ephemeral });
    const result = await fetchLookupParticipant(user.id);
    await interaction.editReply({
      allowedMentions: { parse: [] },
      content: formatLookupParticipant(user.id, result),
    });
  },
};

export default lookupparticipant;
