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

export interface ChannelCreationPorts {
  createCategory: (name: string) => Promise<{ id: string }>;
  createVoiceChannel: (name: string, parentId: string) => Promise<{ id: string }>;
  recordGroupCategory: (groupId: string, categoryId: string) => Promise<void>;
  recordMemberChannel: (memberId: string, channelId: string) => Promise<void>;
  // Invoked after each group finishes, with the accumulated progress text
  // so far, so callers can mirror it into a live status message.
  onGroupComplete?: (progressText: string) => Promise<void>;
}

export interface ChannelCreationResult {
  createdCategories: number;
  createdChannels: number;
  progressLines: string[];
}

/**
 * Creates categories/voice channels missing for each group, skipping rows
 * that already have a `category_id` / `channel_id`, and persisting each
 * creation immediately so a failure partway through leaves already-created
 * categories/channels recorded and resumable on the next run.
 */
export async function createMissingChannels(
  groups: TeamGroup[],
  ports: ChannelCreationPorts,
): Promise<ChannelCreationResult> {
  let createdCategories = 0;
  let createdChannels = 0;
  const progressLines: string[] = [];

  for (const group of groups) {
    let categoryId = group.category_id;
    if (categoryId === null) {
      // Groups are processed one at a time so we don't burst Discord's
      // channel-create rate limit for the guild.
      // eslint-disable-next-line no-await-in-loop
      const category = await ports.createCategory(groupCategoryName(group.index));
      categoryId = category.id;
      // eslint-disable-next-line no-await-in-loop
      await ports.recordGroupCategory(group.id, categoryId);
      createdCategories += 1;
    }

    for (const member of group.members) {
      if (member.channel_id !== null) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const channel = await ports.createVoiceChannel(
        teamChannelName(member.team.index, member.team.name),
        categoryId,
      );
      // eslint-disable-next-line no-await-in-loop
      await ports.recordMemberChannel(member.id, channel.id);
      createdChannels += 1;
    }

    progressLines.push(`${groupCategoryName(group.index)}: done (${group.members.length} team(s))`);
    if (ports.onGroupComplete) {
      // Progress is reported incrementally per group as work completes.
      // eslint-disable-next-line no-await-in-loop
      await ports.onGroupComplete(progressLines.join("\n"));
    }
  }

  return { createdCategories, createdChannels, progressLines };
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

    const { createdCategories, createdChannels } = await createMissingChannels(groups, {
      createCategory: async (name) =>
        await guild.channels.create({
          name,
          permissionOverwrites: [
            { deny: [PermissionFlagsBits.ViewChannel], id: guild.roles.everyone.id },
          ],
          type: ChannelType.GuildCategory,
        }),
      createVoiceChannel: async (name, parentId) =>
        await guild.channels.create({ name, parent: parentId, type: ChannelType.GuildVoice }),
      onGroupComplete: async (progressText) => {
        await interaction.editReply({ content: progressText });
      },
      recordGroupCategory,
      recordMemberChannel,
    });

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
