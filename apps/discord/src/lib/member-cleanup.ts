import type { Guild, GuildMember } from "discord.js";
import type { BestEffortStep } from "./best-effort.js";

/** Steps shared by /unlink and /unlinkstaff: strip roles, clear the nickname, revoke channel access. */
export async function buildCleanupSteps(
  guild: Guild,
  userId: string,
  options: { channelId: string | null; roleIds: (string | null)[]; roleLabel: string },
): Promise<BestEffortStep[]> {
  // A user who left the server has no member to edit, but their overwrite can still be deleted.
  const member: GuildMember | null = await guild.members.fetch(userId).catch(() => null);
  const steps: BestEffortStep[] = [];

  if (member !== null) {
    const roleIds = options.roleIds.filter((roleId): roleId is string => roleId !== null);
    steps.push(
      {
        label: `remove ${options.roleLabel}`,
        run: async () => {
          if (roleIds.length === 0) {
            throw new Error("role not configured, run /setup");
          }
          await member.roles.remove(roleIds);
        },
      },
      {
        label: "reset nickname",
        run: async () => {
          await member.setNickname(null);
        },
      },
    );
  }

  if (options.channelId !== null) {
    const { channelId } = options;
    steps.push({
      label: "revoke channel access",
      run: async () => {
        const channel = await guild.channels.fetch(channelId);
        if (channel && "permissionOverwrites" in channel) {
          await channel.permissionOverwrites.delete(userId);
        }
      },
    });
  }

  return steps;
}
