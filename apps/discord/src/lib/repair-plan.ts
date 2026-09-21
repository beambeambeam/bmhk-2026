import type { RepairFacts } from "../services/discord-admin-api.js";

export interface RepairInput {
  botUserId: string;
  facts: RepairFacts;
  guildMemberIds: Set<string>;
  /** Team voice channels and group categories the bot manages; only these get revoked from. */
  lockedChannelIds: string[];
  /** Roles held by each guild member, by user id. */
  memberRoles: Map<string, Set<string>>;
  /** Member-type overwrites per channel: user id → currently allowed View + Connect. */
  overwrites: Map<string, Map<string, boolean>>;
  participantRoleHolders: Set<string>;
  roles: { admin: string | null; participant: string | null; staff: string | null };
}

export interface RepairPlan {
  grants: { channelId: string; userId: string }[];
  revokes: { channelId: string; userId: string }[];
  roleAdds: { roleId: string; userId: string }[];
  roleRemoves: { roleId: string; userId: string }[];
  skippedUserIds: string[];
}

function allowAccess(
  desired: Map<string, Set<string>>,
  channelId: string | null,
  userId: string,
): void {
  if (channelId === null) {
    return;
  }
  const users = desired.get(channelId) ?? new Set<string>();
  users.add(userId);
  desired.set(channelId, users);
}

function desiredAccess(facts: RepairFacts): Map<string, Set<string>> {
  const desired = new Map<string, Set<string>>();
  for (const participant of facts.participants) {
    allowAccess(desired, participant.channel_id, participant.discord_user_id);
  }
  for (const staff of facts.staff) {
    allowAccess(desired, staff.category_id, staff.discord_user_id);
  }
  return desired;
}

function needsRole(input: RepairInput, userId: string, roleId: string | null): roleId is string {
  return (
    roleId !== null &&
    input.guildMemberIds.has(userId) &&
    input.memberRoles.get(userId)?.has(roleId) !== true
  );
}

function planRoleAdds(input: RepairInput): RepairPlan["roleAdds"] {
  const { facts, roles } = input;
  const adds: RepairPlan["roleAdds"] = [];
  for (const { discord_user_id: userId } of facts.participants) {
    const roleId = roles.participant;
    if (needsRole(input, userId, roleId)) {
      adds.push({ roleId, userId });
    }
  }
  for (const { discord_user_id: userId, is_admin: isAdmin } of facts.staff) {
    const roleId = isAdmin ? roles.admin : roles.staff;
    if (needsRole(input, userId, roleId)) {
      adds.push({ roleId, userId });
    }
  }
  return adds;
}

function planGrants(input: RepairInput, desired: Map<string, Set<string>>): RepairPlan["grants"] {
  const grants: RepairPlan["grants"] = [];
  for (const [channelId, userIds] of desired) {
    for (const userId of userIds) {
      if (
        input.guildMemberIds.has(userId) &&
        input.overwrites.get(channelId)?.get(userId) !== true
      ) {
        grants.push({ channelId, userId });
      }
    }
  }
  return grants;
}

function planRevokes(input: RepairInput, desired: Map<string, Set<string>>): RepairPlan["revokes"] {
  const revokes: RepairPlan["revokes"] = [];
  for (const channelId of input.lockedChannelIds) {
    for (const userId of input.overwrites.get(channelId)?.keys() ?? []) {
      if (userId !== input.botUserId && desired.get(channelId)?.has(userId) !== true) {
        revokes.push({ channelId, userId });
      }
    }
  }
  return revokes;
}

function planRoleRemoves(input: RepairInput): RepairPlan["roleRemoves"] {
  const { participant: roleId } = input.roles;
  if (roleId === null) {
    return [];
  }
  const participantIds = new Set(input.facts.participants.map((entry) => entry.discord_user_id));
  return [...input.participantRoleHolders]
    .filter((userId) => !participantIds.has(userId))
    .map((userId) => ({ roleId, userId }));
}

/**
 * Pure diff between what the DB says and what Discord has. Adds roles/access
 * for linked members; revokes only the participant role and member overwrites
 * on managed channels — staff/admin roles are never removed, since some are
 * handed out by hand and have no link.
 */
export function planRepair(input: RepairInput): RepairPlan {
  const { facts, guildMemberIds } = input;
  const linkedUserIds = [
    ...facts.participants.map((participant) => participant.discord_user_id),
    ...facts.staff.map((staff) => staff.discord_user_id),
  ];
  const desired = desiredAccess(facts);

  return {
    grants: planGrants(input, desired),
    revokes: planRevokes(input, desired),
    roleAdds: planRoleAdds(input),
    roleRemoves: planRoleRemoves(input),
    skippedUserIds: [...new Set(linkedUserIds.filter((userId) => !guildMemberIds.has(userId)))],
  };
}

export interface RepairReportOptions {
  dryRun: boolean;
  /** Labels of applied steps that failed; empty for a dry run. */
  failed: string[];
}

export function formatRepairReport(plan: RepairPlan, options: RepairReportOptions): string {
  const lines = [
    options.dryRun ? "**DRY RUN** — nothing was changed. Planned:" : "**Repair applied.**",
    `Add role: ${plan.roleAdds.length}`,
    `Remove participant role: ${plan.roleRemoves.length}`,
    `Grant access: ${plan.grants.length}`,
    `Revoke access: ${plan.revokes.length}`,
    "",
    ...plan.roleAdds.map(({ roleId, userId }) => `<@${userId}> +<@&${roleId}>`),
    ...plan.roleRemoves.map(({ roleId, userId }) => `<@${userId}> -<@&${roleId}>`),
    ...plan.grants.map(({ channelId, userId }) => `<@${userId}> +access <#${channelId}>`),
    ...plan.revokes.map(({ channelId, userId }) => `<@${userId}> -access <#${channelId}>`),
  ];

  if (plan.skippedUserIds.length > 0) {
    lines.push(
      "",
      `Skipped, not in server (${plan.skippedUserIds.length}):`,
      ...plan.skippedUserIds.map((userId) => `<@${userId}>`),
    );
  }
  if (options.failed.length > 0) {
    lines.push("", `Failed (${options.failed.length}):`, ...options.failed);
  }
  return lines.join("\n");
}
