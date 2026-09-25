import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { fetchCodeInfo } from "../../services/discord-admin-api.js";
import type { CodeInfo, LinkedAccount } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

const CODE_PATTERN = /^[a-zA-Z0-9]{8}$/u;

function accountLine(label: string, account: LinkedAccount | null): string {
  if (account === null) {
    return `${label}: —`;
  }
  const unixSeconds = Math.floor(new Date(account.redeemed_at).getTime() / 1000);
  return `${label}: <@${account.id}> (\`${account.id}\`) <t:${unixSeconds}:f>`;
}

export function formatCodeInfo(code: string, info: CodeInfo): string {
  if (info.status === "NOT_FOUND") {
    return `\`${code}\` is not a known code.`;
  }

  return [
    `\`${code}\` — ${info.status}`,
    `Team: #${info.team.index} ${info.team.name} (${info.team.school})`,
    `Participant: ${info.participant.index}. ${info.participant.name}`,
    accountLine("Discord", info.main),
  ].join("\n");
}

const codeinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("codeinfo")
    .setDescription("(Admin) Look up a join code: redemption status, team, participant.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName("code").setDescription("The 8-character join code.").setRequired(true),
    ),

  async execute(interaction) {
    const code = interaction.options.getString("code", true).trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      await interaction.reply({
        content: "A join code is 8 letters/digits.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply({
      allowedMentions: { parse: [] },
      content: formatCodeInfo(code, await fetchCodeInfo(code)),
    });
  },
};

export default codeinfo;
