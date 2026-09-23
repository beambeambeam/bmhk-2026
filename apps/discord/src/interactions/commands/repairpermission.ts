import { MessageFlags, OverwriteType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Guild } from "discord.js";
import { runBestEffort } from "../../lib/best-effort.js";
import type { BestEffortStep } from "../../lib/best-effort.js";
import { chunkLines } from "../../lib/chunk-lines.js";
import { formatRepairReport, planRepair } from "../../lib/repair-plan.js";
import type { RepairPlan } from "../../lib/repair-plan.js";
import { getRoleSettings } from "../../lib/role-settings.js";
import { fetchRepairFacts } from "../../services/discord-admin-api.js";
import { fetchTeamGroups } from "../../services/team-groups-api.js";
import type { Command } from "../../types.js";

const DISCORD_MESSAGE_LIMIT = 2000;
const ACCESS_BITS = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect];

/** Member-type overwrites on a channel/category: user id → currently allows View + Connect. */
async function readOverwrites(guild: Guild, channelId: string): Promise<Map<string, boolean>> {
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  const result = new Map<string, boolean>();
  if (!channel || !("permissionOverwrites" in channel)) {
    return result;
  }

  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (overwrite.type === OverwriteType.Member) {
      result.set(overwrite.id, overwrite.allow.has(ACCESS_BITS));
    }
  }
  return result;
}

function buildApplySteps(guild: Guild, plan: RepairPlan): BestEffortStep[] {
  return [
    ...plan.roleAdds.map(({ roleId, userId }) => ({
      label: `add <@&${roleId}> to <@${userId}>`,
      run: async () => {
        await guild.members.addRole({ role: roleId, user: userId });
      },
    })),
    ...plan.roleRemoves.map(({ roleId, userId }) => ({
      label: `remove <@&${roleId}> from <@${userId}>`,
      run: async () => {
        await guild.members.removeRole({ role: roleId, user: userId });
      },
    })),
    ...plan.grants.map(({ channelId, userId }) => ({
      label: `grant <@${userId}> <#${channelId}>`,
      run: async () => {
        const channel = await guild.channels.fetch(channelId);
        if (channel && "permissionOverwrites" in channel) {
          await channel.permissionOverwrites.edit(userId, { Connect: true, ViewChannel: true });
        }
      },
    })),
    ...plan.revokes.map(({ channelId, userId }) => ({
      label: `revoke <@${userId}> <#${channelId}>`,
      run: async () => {
        const channel = await guild.channels.fetch(channelId);
        if (channel && "permissionOverwrites" in channel) {
          await channel.permissionOverwrites.delete(userId);
        }
      },
    })),
  ];
}

const repairpermission: Command = {
  data: new SlashCommandBuilder()
    .setName("repairpermission")
    .setDescription("(Admin) Re-sync roles and channel access with the linked participants/staff.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt.setName("dry-run").setDescription("Only report what would change (default: false)."),
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
    const { guild } = interaction;
    const dryRun = interaction.options.getBoolean("dry-run") ?? false;

    const [facts, groups, roles, members] = await Promise.all([
      fetchRepairFacts(),
      fetchTeamGroups(),
      getRoleSettings(),
      guild.members.fetch(),
    ]);

    const lockedChannelIds = groups.flatMap((group) => [
      ...(group.category_id === null ? [] : [group.category_id]),
      ...group.members.flatMap((member) => (member.channel_id === null ? [] : [member.channel_id])),
    ]);
    const groupChannelsByCategory = new Map<string, string[]>(
      groups
        .filter(
          (group): group is typeof group & { category_id: string } => group.category_id !== null,
        )
        .map((group) => [
          group.category_id,
          group.members.flatMap((member) =>
            member.channel_id === null ? [] : [member.channel_id],
          ),
        ]),
    );
    const overwrites = new Map<string, Map<string, boolean>>();
    for (const channelId of lockedChannelIds) {
      // Sequential: one channel fetch at a time keeps this under Discord's rate limit.
      // eslint-disable-next-line no-await-in-loop
      overwrites.set(channelId, await readOverwrites(guild, channelId));
    }

    const plan = planRepair({
      botUserId: guild.client.user.id,
      facts,
      groupChannelsByCategory,
      guildMemberIds: new Set(members.keys()),
      lockedChannelIds,
      memberRoles: new Map(
        members.map((member) => [member.id, new Set(member.roles.cache.keys())]),
      ),
      overwrites,
      participantRoleHolders: new Set(
        roles.participant === null
          ? []
          : members.filter((member) => member.roles.cache.has(roles.participant ?? "")).keys(),
      ),
      roles,
    });

    const failed = dryRun ? [] : await runBestEffort(buildApplySteps(guild, plan));
    const report = formatRepairReport(plan, { dryRun, failed });

    const [first, ...rest] = chunkLines(report.split("\n"), DISCORD_MESSAGE_LIMIT);
    await interaction.editReply({ allowedMentions: { parse: [] }, content: first });
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

export default repairpermission;
