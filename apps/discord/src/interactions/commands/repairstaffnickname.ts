import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BestEffortStep } from "../../lib/best-effort.js";
import { runBestEffort } from "../../lib/best-effort.js";
import { retryOnGatewayRateLimit } from "../../lib/gateway-retry.js";
import { chunkLines } from "../../lib/chunk-lines.js";
import {
  formatStaffNicknameReport,
  planStaffNicknameRepair,
} from "../../lib/staff-nickname-repair.js";
import { fetchStaffNicknames } from "../../services/discord-admin-api.js";
import type { Command } from "../../types.js";

const DISCORD_MESSAGE_LIMIT = 2000;

const repairstaffnickname: Command = {
  data: new SlashCommandBuilder()
    .setName("repairstaffnickname")
    .setDescription("(Admin) Reapply the correct nickname to every linked staff member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild() || interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { guild } = interaction;
    const [facts, members] = await Promise.all([
      fetchStaffNicknames(),
      retryOnGatewayRateLimit(async () => await guild.members.fetch()),
    ]);

    const plan = planStaffNicknameRepair({
      currentNicknames: new Map(members.map((member) => [member.id, member.nickname])),
      facts,
      guildMemberIds: new Set(members.keys()),
    });

    const steps: BestEffortStep[] = plan.steps.map(({ discordUserId, nickname }) => ({
      label: `set nickname of <@${discordUserId}> to "${nickname}"`,
      run: async () => {
        await members.get(discordUserId)?.setNickname(nickname);
      },
    }));
    const failed = await runBestEffort(steps);

    const report = formatStaffNicknameReport(plan, steps.length - failed.length, { failed });
    const [first, ...rest] = chunkLines(report.split("\n"), DISCORD_MESSAGE_LIMIT);
    await interaction.editReply({ allowedMentions: { parse: [] }, content: first ?? report });
    for (const content of rest) {
      // eslint-disable-next-line no-await-in-loop
      await interaction.followUp({
        allowedMentions: { parse: [] },
        content,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default repairstaffnickname;
