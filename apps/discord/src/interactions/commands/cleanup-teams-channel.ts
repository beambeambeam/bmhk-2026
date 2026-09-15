import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  clearGroupCategory,
  clearMemberChannel,
  fetchTeamGroups,
} from "../../services/team-groups-api.js";
import type { TeamGroup } from "../../services/team-groups-api.js";
import type { Command } from "../../types.js";
import { groupCategoryName, teamChannelName } from "./create-teams-channel.js";

export function groupsWithCategory(groups: TeamGroup[]): TeamGroup[] {
  return groups.filter((group) => group.category_id !== null);
}

export interface ChannelCleanupPorts {
  clearGroupCategory: (groupId: string) => Promise<void>;
  clearMemberChannel: (memberId: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
}

export interface ChannelCleanupResult {
  deletedCategories: number;
  deletedChannels: number;
  failureLines: string[];
}

/**
 * Deletes every provisioned category/voice channel and clears the matching
 * Discord state, skipping (and reporting) anything that fails so it stays
 * provisioned and gets retried on the next run instead of being orphaned.
 */
export async function cleanupProvisionedGroups(
  groups: TeamGroup[],
  ports: ChannelCleanupPorts,
): Promise<ChannelCleanupResult> {
  let deletedCategories = 0;
  let deletedChannels = 0;
  const failureLines: string[] = [];

  for (const group of groupsWithCategory(groups)) {
    let allMembersCleared = true;

    for (const member of group.members) {
      if (member.channel_id === null) {
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop -- channels are deleted one at a time to respect Discord's rate limit
        await ports.deleteChannel(member.channel_id);
        // eslint-disable-next-line no-await-in-loop -- see above
        await ports.clearMemberChannel(member.id);
        deletedChannels += 1;
      } catch {
        allMembersCleared = false;
        failureLines.push(
          `${teamChannelName(member.team.index, member.team.name)}: failed to delete voice channel`,
        );
      }
    }

    // A category that still has an undeletable child channel is left alone —
    // deleting it anyway would just orphan that channel outside any category.
    if (!allMembersCleared || group.category_id === null) {
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop -- see above
      await ports.deleteCategory(group.category_id);
      // eslint-disable-next-line no-await-in-loop -- see above
      await ports.clearGroupCategory(group.id);
      deletedCategories += 1;
    } catch {
      failureLines.push(`${groupCategoryName(group.index)}: failed to delete category`);
    }
  }

  return { deletedCategories, deletedChannels, failureLines };
}

const cleanupTeamsChannel: Command = {
  data: new SlashCommandBuilder()
    .setName("cleanupteamschannel")
    .setDescription(
      "Delete every provisioned team-group category/channel and clear their Discord state.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild() || interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();
    const { guild } = interaction;

    const groups = await fetchTeamGroups();

    const result = await cleanupProvisionedGroups(groups, {
      clearGroupCategory,
      clearMemberChannel,
      deleteCategory: async (categoryId) => {
        const channel = await guild.channels.fetch(categoryId).catch(() => null);
        await channel?.delete();
      },
      deleteChannel: async (channelId) => {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        await channel?.delete();
      },
    });

    const summaryLines = [
      `Deleted ${result.deletedCategories} categor${result.deletedCategories === 1 ? "y" : "ies"} and ${result.deletedChannels} channel(s).`,
    ];
    if (result.failureLines.length > 0) {
      summaryLines.push(
        "",
        "Still provisioned (fix permissions and re-run to retry):",
        ...result.failureLines,
      );
    }
    await interaction.editReply({ content: summaryLines.join("\n") });
  },
};

export default cleanupTeamsChannel;
