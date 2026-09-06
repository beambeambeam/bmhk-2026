import { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  fetchTeamGroups,
  recordGroupCategory,
  recordMemberChannel,
} from "../../services/team-groups-api.js";
import type { TeamGroup } from "../../services/team-groups-api.js";
import type { Command } from "../../types.js";

export function groupCategoryName(index: number): string {
  return `หมวดที่ ${index}`;
}

export function teamChannelName(index: number, name: string): string {
  return `${index} - ${name}`;
}

export function groupsMissingOverseer(groups: TeamGroup[]): TeamGroup[] {
  return groups.filter((group) => !group.has_overseer);
}

function overseerWarning(group: TeamGroup): string {
  return `⚠️ ${groupCategoryName(group.index)} has no overseer assigned.`;
}

const createTeamsChannel: Command = {
  data: new SlashCommandBuilder()
    .setName("createteamschannel")
    .setDescription("Create Discord categories and voice channels for every team group.")
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

    const groups = await fetchTeamGroups();
    const warnings = groupsMissingOverseer(groups).map(overseerWarning);

    let createdCategories = 0;
    let createdChannels = 0;
    const progressLines: string[] = [];

    for (const group of groups) {
      let categoryId = group.category_id;
      if (categoryId === null) {
        // Groups are processed one at a time so a failure partway through
        // leaves already-created categories/channels recorded and resumable
        // on the next run, and so we don't burst Discord's channel-create
        // rate limit for the guild.
        // eslint-disable-next-line no-await-in-loop
        const category = await guild.channels.create({
          name: groupCategoryName(group.index),
          permissionOverwrites: [
            { deny: [PermissionFlagsBits.ViewChannel], id: guild.roles.everyone.id },
          ],
          type: ChannelType.GuildCategory,
        });
        categoryId = category.id;
        // eslint-disable-next-line no-await-in-loop
        await recordGroupCategory(group.id, categoryId);
        createdCategories += 1;
      }

      for (const member of group.members) {
        if (member.channel_id !== null) {
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const channel = await guild.channels.create({
          name: teamChannelName(member.team.index, member.team.name),
          parent: categoryId,
          type: ChannelType.GuildVoice,
        });
        // eslint-disable-next-line no-await-in-loop
        await recordMemberChannel(member.id, channel.id);
        createdChannels += 1;
      }

      progressLines.push(
        `${groupCategoryName(group.index)}: done (${group.members.length} team(s))`,
      );
      // Progress is reported incrementally per group as work completes.
      // eslint-disable-next-line no-await-in-loop
      await interaction.editReply({ content: progressLines.join("\n") });
    }

    const summaryLines = [
      `Created ${createdCategories} categor${createdCategories === 1 ? "y" : "ies"} and ${createdChannels} channel(s).`,
    ];
    if (warnings.length > 0) {
      summaryLines.push("", "Warnings:", ...warnings);
    }
    await interaction.editReply({ content: summaryLines.join("\n") });
  },
};

export default createTeamsChannel;
